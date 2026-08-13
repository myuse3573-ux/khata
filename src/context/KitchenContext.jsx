/**
 * KitchenContext.jsx
 * Manages ONLY shared Kitchen Group data:
 * groups, members, roster, kitchen cashbook
 *
 * Completely separate from PersonalContext — no data leakage possible.
 * Real-time via Server-Sent Events (falls back to polling).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { KitchenContext } from "./kitchenContextValue";

const API_BASE = "/api";

export const KitchenProvider = ({ children }) => {
  const { user, token, isAuthenticated, logout } = useAuth();

  // ── Group state ───────────────────────────────────────────────────────────
  const [activeGroup, setActiveGroup] = useState(null); // { id, name, joinCode, role, maxMembers }
  const [myGroups, setMyGroups] = useState([]);          // all groups user belongs to
  const [members, setMembers] = useState([]);
  const [roster, setRoster] = useState([]);
  const [kitchenCashbook, setKitchenCashbook] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setKitchenSyncStatus] = useState("synced");
  const [kitchenError, setKitchenError] = useState("");

  // SSE ref
  const sseRef = useRef(null);
  const pollRef = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Auth headers ──────────────────────────────────────────────────────────
  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }), [token]);

  // ── Clear all kitchen state ───────────────────────────────────────────────
  const clearKitchenState = useCallback(() => {
    setActiveGroup(null);
    setMyGroups([]);
    setMembers([]);
    setRoster([]);
    setKitchenCashbook([]);
    setKitchenError("");
    setKitchenSyncStatus("synced");
  }, []);

  // ── Stop all real-time connections ────────────────────────────────────────
  const stopRealtime = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Clear on logout ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtime();
      clearKitchenState();
    }
  }, [isAuthenticated, stopRealtime, clearKitchenState]);

  // ── Load user's groups on login ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) return;

    const loadGroups = async () => {
      try {
        const res = await fetch(`${API_BASE}/kitchen/my-groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) { logout(); return; }
        if (res.ok) {
          const data = await res.json();
          setMyGroups(data.groups || []);
          // Restore last active group from localStorage
          const savedGroupId = localStorage.getItem(`khata_active_kitchen_${user.id}`);
          if (savedGroupId) {
            const found = (data.groups || []).find(g => g.id === savedGroupId);
            if (found) activateGroup(found);
          }
        }
      } catch { /* server offline */ }
    };

    loadGroups();
  }, [isAuthenticated, token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect to SSE for active group, fall back to polling ─────────────────
  const startRealtime = useCallback((groupId) => {
    stopRealtime();
    if (!token || !groupId) return;

    // Try SSE first
    const eventSource = new EventSource(
      `${API_BASE}/kitchen/${groupId}/events?token=${encodeURIComponent(token)}`
    );

    let sseWorking = false;

    eventSource.onopen = () => {
      sseWorking = true;
      // Clear polling fallback if SSE works
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleRealtimeEvent(event);
      } catch { /* ignore malformed events */ }
    };

    eventSource.onerror = () => {
      eventSource.close();
      sseRef.current = null;
      // Fall back to 8-second polling (less aggressive than 3s)
      if (!pollRef.current) {
        pollRef.current = setInterval(() => fetchGroupData(groupId), 8000);
      }
    };

    sseRef.current = eventSource;

    // If SSE hasn't connected in 3s, start polling fallback
    setTimeout(() => {
      if (!sseWorking && !pollRef.current) {
        pollRef.current = setInterval(() => fetchGroupData(groupId), 8000);
      }
    }, 3000);
  }, [token, stopRealtime]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle incoming SSE events ─────────────────────────────────────────────
  const handleRealtimeEvent = useCallback((event) => {
    switch (event.event) {
      case "data_updated":
        if (event.roster !== undefined) setRoster(event.roster);
        if (event.cashbook !== undefined) setKitchenCashbook(event.cashbook);
        break;
      case "member_status_changed":
        setMembers(prev => prev.map(m =>
          (m.id === event.memberId || (event.userId && m.userId === event.userId))
            ? {
                ...m,
                status: event.status,
                pausedBy: event.pausedBy,
                pausedByName: event.pausedByName,
                pausedAt: event.pausedAt
              }
            : m
        ));
        break;
      case "member_joined":
        fetchGroupData(activeGroup?.id); // Reload full member list
        break;
      case "member_left":
        setMembers(prev => prev.filter(m => m.id !== event.userId));
        break;
      case "member_role_changed":
        setMembers(prev => prev.map(m =>
          m.id === event.memberId ? { ...m, role: event.role } : m
        ));
        break;
      default: break;
    }
  }, [activeGroup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch full group data ─────────────────────────────────────────────────
  const fetchGroupData = useCallback(async (groupId) => {
    if (!groupId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/kitchen/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); return; }
      if (res.status === 403) {
        // No longer a member — clear
        clearKitchenState();
        showToast("You are no longer a member of this kitchen group.", "error");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setRoster(data.roster || []);
        setKitchenCashbook(data.cashbook || []);
        setActiveGroup(prev => prev ? { ...prev, ...data.group, role: data.myRole } : null);
        setKitchenSyncStatus("synced");
      }
    } catch {
      setKitchenSyncStatus("pending");
    }
  }, [token, logout, clearKitchenState, showToast]);

  // ── Activate a group ───────────────────────────────────────────────────────
  const activateGroup = useCallback(async (group) => {
    setActiveGroup(group);
    setIsLoading(true);
    await fetchGroupData(group.id);
    startRealtime(group.id);
    if (user?.id) localStorage.setItem(`khata_active_kitchen_${user.id}`, group.id);
    setIsLoading(false);
  }, [fetchGroupData, startRealtime, user?.id]);

  // ── Create kitchen group ──────────────────────────────────────────────────
  const createKitchenGroup = async (name) => {
    setKitchenError("");
    try {
      const res = await fetch(`${API_BASE}/kitchen/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return null; }
      if (res.ok && data.status === "success") {
        const newGroup = { ...data.group, memberCount: 1 };
        setMyGroups(prev => [newGroup, ...prev]);
        await activateGroup(newGroup);
        showToast(`🎉 Kitchen group "${name}" created! Share code: ${data.group.joinCode}`);
        return data.group;
      } else {
        setKitchenError(data.error || "Failed to create group.");
        return null;
      }
    } catch {
      setKitchenError("Server unavailable. Please try again.");
      return null;
    }
  };

  // ── Join kitchen group ────────────────────────────────────────────────────
  const joinKitchenGroup = async (joinCode) => {
    setKitchenError("");
    try {
      const res = await fetch(`${API_BASE}/kitchen/join`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return null; }
      if (res.ok && data.status === "success") {
        const joinedGroup = { ...data.group };
        setMyGroups(prev => {
          const exists = prev.find(g => g.id === joinedGroup.id);
          return exists ? prev : [joinedGroup, ...prev];
        });
        await activateGroup(joinedGroup);
        showToast(`✅ Joined "${data.group.name}" successfully!`);
        return data.group;
      } else {
        setKitchenError(data.error || "Invalid join code. Please check and try again.");
        return null;
      }
    } catch {
      setKitchenError("Server unavailable. Please try again.");
      return null;
    }
  };

  // ── Leave kitchen group ───────────────────────────────────────────────────
  const leaveKitchenGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/kitchen/${groupId}/leave`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return false; }
      if (res.ok) {
        stopRealtime();
        setMyGroups(prev => prev.filter(g => g.id !== groupId));
        if (activeGroup?.id === groupId) {
          clearKitchenState();
          if (user?.id) localStorage.removeItem(`khata_active_kitchen_${user.id}`);
        }
        showToast("Left the kitchen group.", "error");
        return true;
      } else {
        showToast(data.error || "Could not leave group.", "error");
        return false;
      }
    } catch {
      showToast("Server unavailable.", "error");
      return false;
    }
  };

  // ── Sync kitchen data to server ───────────────────────────────────────────
  const syncKitchen = useCallback(async (newRoster, newCashbook) => {
    if (!activeGroup?.id || !token) return;
    setKitchenSyncStatus("pending");
    try {
      const payload = {};
      if (newRoster !== undefined) payload.roster = newRoster;
      if (newCashbook !== undefined) payload.cashbook = newCashbook;

      const res = await fetch(`${API_BASE}/kitchen/${activeGroup.id}/sync`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.status === 401) { logout(); return; }
      if (res.ok) setKitchenSyncStatus("synced");
      else setKitchenSyncStatus("failed");
    } catch {
      setKitchenSyncStatus("failed");
    }
  }, [activeGroup?.id, token, authHeaders, logout]);

  // ── Toggle member pause ───────────────────────────────────────────────────
  const toggleMemberPause = async (memberId) => {
    const member = members.find(m => m.id === memberId || m.userId === memberId);
    if (!member) return;
    const newStatus = member.status === "paused" ? "active" : "paused";
    const actorName = user?.name || "Roommate";
    const nowIso = newStatus === "paused" ? new Date().toISOString() : null;

    setMembers(prev => prev.map(m =>
      (m.id === member.id || m.id === memberId || (m.userId && m.userId === memberId))
        ? {
            ...m,
            status: newStatus,
            pausedBy: newStatus === "paused" ? user?.id : null,
            pausedByName: newStatus === "paused" ? actorName : null,
            pausedAt: nowIso
          }
        : m
    ));
    showToast(newStatus === "paused" ? `${member.name} paused by ${actorName} ⏸️` : `${member.name} resumed ▶️`);

    if (!activeGroup?.id) return;

    try {
      const res = await fetch(`${API_BASE}/kitchen/${activeGroup.id}/member/toggle-pause`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ memberId: member.id || memberId, status: newStatus })
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!res.ok) {
        setMembers(prev => prev.map(m => (m.id === member.id || m.id === memberId) ? { ...m, status: member.status } : m));
        showToast(data.error || "Could not update member status.", "error");
      } else if (data.status === "success") {
        setMembers(prev => prev.map(m =>
          (m.id === member.id || m.id === memberId)
            ? {
                ...m,
                status: newStatus,
                pausedBy: data.pausedBy,
                pausedByName: data.pausedByName,
                pausedAt: data.pausedAt
              }
            : m
        ));
      }
    } catch {
      setMembers(prev => prev.map(m => (m.id === member.id || m.id === memberId) ? { ...m, status: member.status } : m));
      showToast("Server unavailable.", "error");
    }
  };

  // ── Roster operations ─────────────────────────────────────────────────────
  const addRosterItem = (rosterData) => {
    const newItem = {
      id: `rst_${Date.now()}`,
      currentTurnIndex: 0,
      history: [],
      createdAt: new Date().toISOString(),
      lastEditedBy: user?.name || "Member",
      lastEditedAt: new Date().toISOString(),
      ...rosterData
    };
    const next = [newItem, ...roster];
    setRoster(next);
    syncKitchen(next, undefined);
    showToast(`"${newItem.itemName}" duty added!`);
    return newItem;
  };

  const editRosterItem = (id, updatedData) => {
    const next = roster.map(r =>
      r.id === id
        ? { ...r, ...updatedData, lastEditedBy: user?.name || "Member", lastEditedAt: new Date().toISOString() }
        : r
    );
    setRoster(next);
    syncKitchen(next, undefined);
    showToast("Duty item updated!");
  };

  const markRosterBrought = (rosterId, memberId, cost = 0, note = "", customDateTime = null) => {
    const logDate = customDateTime ? new Date(customDateTime).toISOString() : new Date().toISOString();
    const authorName = user?.name || "Member";
    let itemName = "";

    const nextRoster = roster.map(item => {
      if (item.id !== rosterId) return item;
      itemName = item.itemName;

      const activeIds = (item.memberIds || []).filter(mId => {
        const m = members.find(mm => mm.id === mId || mm.userId === mId);
        return m ? m.status !== "paused" : true;
      });
      const useIds = activeIds.length > 0 ? activeIds : (item.memberIds || []);
      const nextTurnIndex = useIds.length > 0
        ? (item.currentTurnIndex + 1) % useIds.length
        : 0;

      return {
        ...item,
        currentTurnIndex: nextTurnIndex,
        lastBroughtBy: memberId,
        lastBroughtDate: logDate,
        lastBroughtCost: Number(cost) || 0,
        lastEditedBy: authorName,
        lastEditedAt: new Date().toISOString(),
        history: [
          { memberId, date: logDate, cost: Number(cost) || 0, note: note || "Brought", markedBy: authorName },
          ...(item.history || [])
        ]
      };
    });

    setRoster(nextRoster);

    let nextCashbook = kitchenCashbook;
    if (cost && Number(cost) > 0) {
      const memberObj = members.find(m => m.id === memberId);
      const memberName = memberObj?.name || "Member";
      const newCashEntry = {
        id: `cb_${Date.now()}`,
        type: "out",
        amount: Number(cost),
        date: logDate,
        category: "Duty Rotation",
        note: `${itemName} brought by ${memberName}`,
        mode: "Cash",
        lastEditedBy: authorName
      };
      nextCashbook = [newCashEntry, ...kitchenCashbook];
      setKitchenCashbook(nextCashbook);
    }

    syncKitchen(nextRoster, nextCashbook);
    showToast("Brought! Turn advanced & synced 🔄");
  };

  const deleteRosterItem = (id) => {
    const next = roster.filter(r => r.id !== id);
    setRoster(next);
    syncKitchen(next, undefined);
    showToast("Duty item removed.", "error");
  };

  // ── Kitchen cashbook ──────────────────────────────────────────────────────
  const addKitchenCashEntry = (cashData) => {
    const newEntry = {
      id: `kcb_${Date.now()}`,
      date: cashData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastEditedBy: user?.name || "Member",
      ...cashData
    };
    const next = [newEntry, ...kitchenCashbook];
    setKitchenCashbook(next);
    syncKitchen(undefined, next);
    showToast(newEntry.type === "in" ? "Cash In logged!" : "Cash Out logged!");
    return newEntry;
  };

  const deleteKitchenCashEntry = (id) => {
    const next = kitchenCashbook.filter(c => c.id !== id);
    setKitchenCashbook(next);
    syncKitchen(undefined, next);
    showToast("Cash entry removed.", "error");
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const getInviteInfo = async () => {
    if (!activeGroup?.id) return null;
    try {
      const res = await fetch(`${API_BASE}/kitchen/${activeGroup.id}/invite`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch { /* offline */ }
    return null;
  };

  // ── Add manual roommate/member ───────────────────────────────────────────
  const addManualMember = async (name, phone = "") => {
    if (!activeGroup?.id) {
      showToast("Please create or join a kitchen group first.", "error");
      return null;
    }
    if (!name?.trim()) return null;

    try {
      const res = await fetch(`${API_BASE}/kitchen/${activeGroup.id}/member/add-manual`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() })
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return null; }
      if (res.ok && data.member) {
        setMembers(prev => [...prev, data.member]);
        showToast(`Added "${name}" to kitchen group!`);
        return data.member;
      } else {
        showToast(data.error || "Failed to add member.", "error");
        return null;
      }
    } catch {
      showToast("Server unavailable.", "error");
      return null;
    }
  };

  // ── Delete member from kitchen group ─────────────────────────────────────
  const removeMember = async (memberId) => {
    if (!activeGroup?.id) return false;

    try {
      const res = await fetch(`${API_BASE}/kitchen/${activeGroup.id}/member/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ memberId })
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return false; }
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId && m.userId !== memberId));
        setRoster(prev => prev.map(item => ({
          ...item,
          memberIds: (item.memberIds || []).filter(mId => mId !== memberId && mId !== data.userId)
        })));
        showToast("Member removed from kitchen group.", "error");
        return true;
      } else {
        showToast(data.error || "Could not remove member.", "error");
        return false;
      }
    } catch {
      showToast("Server unavailable.", "error");
      return false;
    }
  };

  return (
    <KitchenContext.Provider
      value={{
        // Groups
        activeGroup, myGroups,
        activateGroup, createKitchenGroup, joinKitchenGroup, leaveKitchenGroup,
        // Members
        members, toggleMemberPause, addManualMember, removeMember,
        // Roster
        roster, addRosterItem, editRosterItem, markRosterBrought, deleteRosterItem,
        // Kitchen cashbook
        kitchenCashbook, addKitchenCashEntry, deleteKitchenCashEntry,
        // State
        isLoading, syncStatus, kitchenError, setKitchenError,
        // Utilities
        fetchGroupData, getInviteInfo,
        // Toast (kitchen-specific)
        toast, showToast
      }}
    >
      {children}
    </KitchenContext.Provider>
  );
};

