const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const newNoteBtn = document.getElementById("newNoteBtn");
const clearBtn = document.getElementById("clearBtn");
const notes = document.getElementById("notes");

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let finalTranscript = "";

if (SpeechRecognition) {

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";


    // START SPEAKING
    startBtn.addEventListener("click", function () {
        recognition.start();
    });


    // STOP SPEAKING
    stopBtn.addEventListener("click", function () {
        recognition.stop();
    });


    // CONVERT SPEECH TO TEXT
    recognition.addEventListener("result", function (event) {

        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {

            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {

                finalTranscript += transcript + " ";

            } else {

                interimTranscript += transcript;
            }
        }

        notes.value = finalTranscript + interimTranscript;
    });

}


// NEW NOTE
newNoteBtn.addEventListener("click", function () {

    finalTranscript = "";

    notes.value = "";

});


// CLEAR NOTES
clearBtn.addEventListener("click", function () {

    finalTranscript = "";

    notes.value = "";

});