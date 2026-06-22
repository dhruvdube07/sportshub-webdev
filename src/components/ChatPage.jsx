import { useEffect, useRef, useState } from "react";
import { getSupabase, supabaseErrorMessage } from "../lib/supabaseClient";

const initialUserForm = { name: "", pin: "" };
const initialCreateForm = { name: "", passkey: "", expiryWeeks: "6" };

function ChatPage() {
  const [supabase, setSupabase] = useState(getSupabase());
  const [clientAvailable, setClientAvailable] = useState(!!getSupabase());
  const [statusMessage, setStatusMessage] = useState(
    "Enter your name and 4-digit PIN to join or create chat rooms."
  );
  const [busy, setBusy] = useState(false);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [joinPasskeys, setJoinPasskeys] = useState({});
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const channelRef = useRef(null);
  const pollRef = useRef(null);

  const formatSupabaseError = (error, fallback) => {
    const message = error?.message || fallback || "Unknown error.";
    if (message.includes("Could not find the table")) {
      return `${message} — run the SQL in Webdev/supabase-table.sql in the Supabase SQL editor, then refresh your app.`;
    }
    if (message.includes("schema cache")) {
      return `${message} — run the SQL in Webdev/supabase-table.sql in the Supabase SQL editor, then refresh your app.`;
    }
    return message;
  };

  useEffect(() => {
    if (!supabase) {
      setSupabase(getSupabase());
      return;
    }
    loadRooms();
  }, [supabase]);

  useEffect(() => {
    if (!activeRoom || !supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${activeRoom.id}`,
        },
        (payload) => {
          const newMessage = payload.new || payload.record || payload;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });

    pollRef.current = setInterval(() => {
      loadMessages(activeRoom.id);
    }, 3000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeRoom, supabase]);

  const loadRooms = async () => {
    if (!supabase) return;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("id,name,creator_id,expires_at,created_at")
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadRooms error", error);
      setStatusMessage(
        `Could not load chat rooms. ${formatSupabaseError(error, "Check Supabase setup.")}`
      );
      return;
    }

    setRooms(data || []);
  };

  const handleUserField = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
    setStatusMessage("Enter your name and 4-digit PIN to continue.");
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setStatusMessage(supabaseErrorMessage);
      return;
    }

    const name = userForm.name.trim();
    const pin = userForm.pin.trim();

    if (!name || pin.length !== 4 || Number.isNaN(Number(pin))) {
      setStatusMessage("Please enter a valid name and a 4-digit PIN.");
      return;
    }

    setBusy(true);
    try {
      const { data: existingUser, error } = await supabase
        .from("chat_users")
        .select("id,name,pin")
        .eq("name", name)
        .maybeSingle();

      if (error) {
        console.error("user lookup error", error);
        throw error;
      }

      if (existingUser) {
        if (existingUser.pin !== pin) {
          setStatusMessage(
            "Name already exists. Enter the correct 4-digit PIN or choose another name."
          );
        } else {
          setUser(existingUser);
          setStatusMessage(`Welcome back, ${existingUser.name}. Choose a room to join.`);
        }
      } else {
        const { data: newUser, error: insertError } = await supabase
          .from("chat_users")
          .insert({ name, pin })
          .select("id,name")
          .single();

        if (insertError) throw insertError;

        setUser(newUser);
        setStatusMessage(
          `Created profile ${newUser.name}. You can now join or create a chat room.`
        );
      }
    } catch (error) {
      console.error("user setup error", error);
      setStatusMessage(
        `User setup error: ${formatSupabaseError(error, "Could not access chat_users table.")}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoinPasskey = (roomId, value) => {
    setJoinPasskeys((prev) => ({ ...prev, [roomId]: value }));
  };

  const handleRoomJoin = async (room) => {
    if (!supabase) return;
    const passkey = (joinPasskeys[room.id] || "").trim();
    if (!passkey || passkey.length < 4 || passkey.length > 6) {
      setStatusMessage("Enter the 4-6 digit passkey for this room.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("id,name,creator_id,expires_at")
        .eq("id", room.id)
        .eq("passkey", passkey)
        .maybeSingle();

      if (error) {
        console.error("room join error", error);
        throw error;
      }
      if (!data) {
        setStatusMessage("Passkey incorrect or room expired. Try again.");
        return;
      }

      setActiveRoom(data);
      setSelectedRoomId(data.id);
      await loadMessages(data.id);
      setStatusMessage(`Joined ${data.name}. Start chatting!`);
    } catch (error) {
      console.error("join room error", error);
      setStatusMessage(
        `Join error: ${formatSupabaseError(error, "Could not access chat_rooms.")}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setStatusMessage("Fill in room name, passkey, and expiry to create a room.");
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!supabase || !user) {
      setStatusMessage("Please sign in before creating a room.");
      return;
    }

    const name = createForm.name.trim();
    const passkey = createForm.passkey.trim();
    const expiryWeeks = Number(createForm.expiryWeeks);

    if (!name || passkey.length < 4 || passkey.length > 6 || Number.isNaN(expiryWeeks)) {
      setStatusMessage("Room name and a 4-6 digit passkey are required.");
      return;
    }

    setBusy(true);
    try {
      const expiresAt = new Date(Date.now() + expiryWeeks * 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("chat_rooms")
        .insert({
          name,
          passkey,
          creator_id: user.id,
          expires_at: expiresAt,
        })
        .select("id,name,creator_id,expires_at")
        .single();

      if (error) {
        console.error("create room error", error);
        throw error;
      }

      await loadRooms();
      setActiveRoom(data);
      setSelectedRoomId(data.id);
      setMessages([]);
      setCreateForm(initialCreateForm);
      setStatusMessage(`Room ${data.name} created. Share its name and passkey with your group.`);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(`Room: ${data.name}\nRoom ID: ${data.id}`);
        setStatusMessage(
          `Room ${data.name} created and room info copied to clipboard.`
        );
      }
    } catch (error) {
      console.error("create room error", error);
      setStatusMessage(
        `Create room error: ${formatSupabaseError(error, "Could not access chat_rooms.")}`
      );
    } finally {
      setBusy(false);
    }
  };

  const loadMessages = async (roomId) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,room_id,user_id,user_name,text,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("load messages error", error);
      setStatusMessage(
        `Could not load messages for this room. ${formatSupabaseError(error, "Check chat_messages table.")}`
      );
      return;
    }

    setMessages((prev) => {
      if (!data) return prev;
      const existingIds = new Set(prev.map((msg) => msg.id));
      const merged = [...prev];
      for (const message of data) {
        if (!existingIds.has(message.id)) {
          merged.push(message);
        }
      }
      return merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
  };

  const handleSendMessage = async () => {
    if (!supabase || !activeRoom || !user) return;
    const text = messageText.trim();
    if (!text) return;

    setMessageText("");
    const optimisticMessage = {
      id: `pending-${Date.now()}`,
      room_id: activeRoom.id,
      user_id: user.id,
      user_name: user.name,
      text,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: activeRoom.id,
        user_id: user.id,
        user_name: user.name,
        text,
      })
      .select("id,room_id,user_id,user_name,text,created_at")
      .single();

    if (error) {
      console.error("send message error", error);
      setStatusMessage(
        `Could not send message. ${formatSupabaseError(error, "Check chat_messages table.")}`
      );
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      return;
    }

    setMessages((prev) => {
      const existing = prev.filter((message) => message.id !== optimisticMessage.id);
      return [...existing, data];
    });
  };

  const handleDeleteRoom = async () => {
    if (!supabase || !activeRoom || !user) return;
    if (activeRoom.creator_id !== user.id) {
      setStatusMessage("Only the room creator can delete this group.");
      return;
    }

    const { error } = await supabase
      .from("chat_rooms")
      .delete()
      .eq("id", activeRoom.id);

    if (error) {
      console.error("delete room error", error);
      setStatusMessage(
        `Could not delete room. ${formatSupabaseError(error, "Check chat_rooms table.")}`
      );
      return;
    }

    setActiveRoom(null);
    setMessages([]);
    setSelectedRoomId(null);
    await loadRooms();
    setStatusMessage("Room deleted successfully.");
  };

  const isLoggedIn = Boolean(user);

  return (
    <section className="chat-page">
      <h2>Realtime Chat Rooms</h2>
      <p>
        Use your name and 4-digit PIN to sign in, then join or create a room. Rooms use a 4-6 digit passkey. Creator can delete rooms and rooms expire automatically.
      </p>

      {!clientAvailable && (
        <div className="chat-card">
          <p>{supabaseErrorMessage}</p>
        </div>
      )}

      <div className="chat-grid">
        <div className="chat-card">
          <h3>Your profile</h3>
          <form className="chat-form" onSubmit={handleUserSubmit}>
            <div className="chat-field">
              <label>Name</label>
              <input
                value={userForm.name}
                onChange={(e) => handleUserField("name", e.target.value)}
                placeholder="Enter your name"
                disabled={!!user}
              />
            </div>
            <div className="chat-field">
              <label>4-digit PIN</label>
              <input
                type="password"
                value={userForm.pin}
                onChange={(e) => handleUserField("pin", e.target.value)}
                placeholder="1234"
                disabled={!!user}
              />
            </div>
            <div className="chat-actions">
              <button className="chat-button" type="submit" disabled={busy || !!user}>
                {user ? "Signed in" : "Sign in"}
              </button>
              {user && (
                <button
                  type="button"
                  className="chat-delete"
                  onClick={() => {
                    setUser(null);
                    setUserForm(initialUserForm);
                    setStatusMessage("Signed out. Enter name and PIN to continue.");
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="chat-card">
          <h3>Create a room</h3>
          <form className="chat-form" onSubmit={handleCreateRoom}>
            <div className="chat-field">
              <label>Room name</label>
              <input
                value={createForm.name}
                onChange={(e) => handleCreateField("name", e.target.value)}
                placeholder="Sports Chat, Friends, Study Group"
                disabled={!isLoggedIn}
              />
            </div>
            <div className="chat-field">
              <label>Room passkey (4-6 digits)</label>
              <input
                type="password"
                value={createForm.passkey}
                onChange={(e) => handleCreateField("passkey", e.target.value)}
                placeholder="Enter room passkey"
                disabled={!isLoggedIn}
              />
            </div>
            <div className="chat-field">
              <label>Expiry</label>
              <select
                value={createForm.expiryWeeks}
                onChange={(e) => handleCreateField("expiryWeeks", e.target.value)}
                disabled={!isLoggedIn}
              >
                <option value="6">6 weeks</option>
                <option value="8">8 weeks</option>
                <option value="12">12 weeks</option>
                <option value="18">18 weeks</option>
              </select>
            </div>
            <div className="chat-actions">
              <button className="chat-button" disabled={!isLoggedIn || busy}>
                Create room
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="chat-card">
        <h3>Available rooms</h3>
        {rooms.length === 0 ? (
          <p>No active rooms yet. Create one to start chatting.</p>
        ) : (
          <div className="room-list">
            {rooms.map((room) => (
              <div key={room.id} className="room-row">
                <div>
                  <strong>{room.name}</strong>
                  <p>Expires {new Date(room.expires_at).toLocaleDateString()}</p>
                </div>
                <div className="room-join">
                  <input
                    type="password"
                    placeholder="Passkey"
                    value={joinPasskeys[room.id] || ""}
                    onChange={(e) => handleJoinPasskey(room.id, e.target.value)}
                  />
                  <button
                    className="chat-button"
                    type="button"
                    onClick={() => handleRoomJoin(room)}
                    disabled={!isLoggedIn || busy}
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeRoom && (
        <div className="chat-card">
          <div className="chat-room-header">
            <div>
              <h3>{activeRoom.name}</h3>
              <p>{`Room ID: ${activeRoom.id} · Joined as ${user?.name}`}</p>
            </div>
            {activeRoom.creator_id === user?.id && (
              <button className="chat-delete" type="button" onClick={handleDeleteRoom}>
                Delete room
              </button>
            )}
          </div>

          <div className="messages-box">
            {messages.length === 0 ? (
              <p className="empty-state">No messages yet. Say hi!</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="message-row">
                  <span className="message-user">{message.user_name}</span>
                  <span className="message-time">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                  <p>{message.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="chat-input-row">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button className="chat-button" type="button" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}

      <div className="chat-status">
        <p>{statusMessage}</p>
      </div>
    </section>
  );
}

export default ChatPage;
