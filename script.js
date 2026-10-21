
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const newBtn = document.getElementById("newBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const noteTitle = document.getElementById("noteTitle");
const noteText = document.getElementById("noteText");
const savedNotes = document.getElementById("savedNotes");
const statusText = document.getElementById("status");

const STORAGE_KEY = "speechNotes";

let notes = loadNotes();
let currentNoteId = null;
let recognition = null;
let isRecording = false;
let finalTranscript = "";
let sessionId = 0;
let saveTimer = null;

// Load previously saved notes
function loadNotes() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Could not load notes:", error);
        return [];
    }
}

// Save notes to browser storage
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        renderNotes();
        return true;
    } catch (error) {
        console.error("Could not save notes:", error);
        statusText.textContent = "Unable to save. Check browser storage.";
        return false;
    }
}

// Create a new note ID
function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// Find the note currently being edited
function getCurrentNote() {
    return notes.find(note => note.id === currentNoteId);
}

// Automatically save the current note
function saveCurrentNote(showMessage = false) {
    const title = noteTitle.value.trim() || "Untitled Note";
    const content = noteText.value.trim();

    // Do not create empty notes
    if (!content) {
        if (showMessage) {
            statusText.textContent = "Write or record something first.";
        }
        return false;
    }

    let note = getCurrentNote();

    if (!note) {
        note = {
            id: createId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            title: title,
            content: content
        };

        notes.unshift(note);
        currentNoteId = note.id;
    } else {
        note.title = title;
        note.content = content;
        note.updatedAt = new Date().toISOString();
    }

    const success = saveToStorage();

    if (success && showMessage) {
        statusText.textContent = "Note saved successfully!";
    }

    return success;
}

// Render saved notes on the page
function renderNotes() {
    savedNotes.replaceChildren();

    if (notes.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No saved notes yet. Start speaking!";
        savedNotes.appendChild(message);
        return;
    }

    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";

        const heading = document.createElement("h3");
        heading.textContent = note.title || "Untitled Note";

        const preview = document.createElement("p");
        preview.textContent = note.content.slice(0, 120) +
            (note.content.length > 120 ? "..." : "");

        const date = document.createElement("p");
        date.textContent = "Last updated: " +
            new Date(note.updatedAt).toLocaleString();

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const openBtn = document.createElement("button");
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", () => openNote(note.id));

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Delete";
        removeBtn.className = "danger";
        removeBtn.addEventListener("click", () => deleteNote(note.id));

        actions.append(openBtn, removeBtn);
        card.append(heading, preview, date, actions);
        savedNotes.appendChild(card);
    });
}

// Open an existing note
function openNote(id) {
    if (isRecording) {
        stopRecording();
    }

    // Save current work before switching notes
    if (noteText.value.trim() && !saveCurrentNote()) {
        return;
    }

    const note = notes.find(item => item.id === id);
    if (!note) return;

    currentNoteId = note.id;
    noteTitle.value = note.title;
    noteText.value = note.content;
    finalTranscript = note.content;

    statusText.textContent = "Opened: " + note.title;
    renderNotes();
}

// Start a completely new note without deleting saved notes
function newNote() {
    if (isRecording) {
        stopRecording();
    }

    if (noteText.value.trim() && !saveCurrentNote()) {
        return;
    }

    currentNoteId = null;
    noteTitle.value = "";
    noteText.value = "";
    finalTranscript = "";

    statusText.textContent = "Ready for a new note.";
    noteTitle.focus();
}

// Delete one saved note
function deleteNote(id) {
    const note = notes.find(item => item.id === id);
    if (!note) return;

    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) {
        return;
    }

    notes = notes.filter(item => item.id !== id);

    if (currentNoteId === id) {
        currentNoteId = null;
        noteTitle.value = "";
        noteText.value = "";
        finalTranscript = "";
    }

    if (saveToStorage()) {
        statusText.textContent = "Note deleted.";
    }
}

// Delete all saved notes
function deleteAllNotes() {
    if (notes.length === 0) {
        statusText.textContent = "There are no saved notes.";
        return;
    }

    if (!confirm("Delete ALL saved notes? This cannot be undone.")) {
        return;
    }

    if (isRecording) {
        stopRecording();
    }

    notes = [];

    try {
        localStorage.removeItem(STORAGE_KEY);
        currentNoteId = null;
        noteTitle.value = "";
        noteText.value = "";
        finalTranscript = "";
        renderNotes();
        statusText.textContent = "All notes deleted.";
    } catch (error) {
        statusText.textContent = "Could not delete saved notes.";
    }
}

// Automatically save text changes
function scheduleAutoSave() {
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        if (noteText.value.trim()) {
            saveCurrentNote();
        }
    }, 700);
}

// Speech Recognition setup
const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        startBtn.disabled = true;
        statusText.textContent = "Listening... Speak now.";
    };

    recognition.onresult = event => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
            } else {
                interimTranscript += transcript;
            }
        }

        noteText.value =
            finalTranscript + interimTranscript;

        scheduleAutoSave();
    };

    recognition.onerror = event => {
        statusText.textContent =
            "Speech recognition error: " + event.error;
    };

    recognition.onend = () => {
        isRecording = false;
        startBtn.disabled = false;

        // Save only if this is still the current recording session
        if (noteText.value.trim()) {
            saveCurrentNote();
        }

        if (statusText.textContent === "Listening... Speak now.") {
            statusText.textContent = "Recording stopped.";
        }
    };

} else {
    startBtn.disabled = true;
    statusText.textContent =
        "Speech recognition is not supported in this browser. Try Chrome.";
}

// Start speaking
function startRecording() {
    if (!recognition || isRecording) return;

    // A fresh session starts from existing text if editing a note
    finalTranscript = noteText.value;

    sessionId++;

    try {
        recognition.start();
    } catch (error) {
        statusText.textContent =
            "Could not start recording. Please try again.";
    }
}

// Stop speaking and save the note
function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }

    clearTimeout(saveTimer);

    if (noteText.value.trim()) {
        saveCurrentNote(true);
    } else {
        statusText.textContent = "Recording stopped.";
    }
}

// Button events
startBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
newBtn.addEventListener("click", newNote);

saveBtn.addEventListener("click", () => {
    clearTimeout(saveTimer);
    saveCurrentNote(true);
});

deleteBtn.addEventListener("click", () => {
    if (currentNoteId) {
        deleteNote(currentNoteId);
    } else {
        noteTitle.value = "";
        noteText.value = "";
        finalTranscript = "";
        statusText.textContent = "Unsaved note cleared.";
    }
});

clearAllBtn.addEventListener("click", deleteAllNotes);

noteTitle.addEventListener("input", scheduleAutoSave);
noteText.addEventListener("input", () => {
    finalTranscript = noteText.value;
    scheduleAutoSave();
});

// Save work when the page is about to close
window.addEventListener("pagehide", () => {
    clearTimeout(saveTimer);

    if (noteText.value.trim()) {
        saveCurrentNote();
    }
});

// Show notes saved from previous visits
renderNotes();
