console.log("app.js loaded!");

function addMessage(text, sender = "ranger") {
    const container = document.getElementById("chatMessages");
    const row = document.createElement("div");
    row.classList.add("chat-row", sender);

    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    bubble.classList.add(sender === "user" ? "user-bubble" : "ranger-bubble");

    // Render readable markdown (bold, bullets, headings)
    bubble.innerHTML = marked.parse(text);

    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}


async function sendText() {
    const textarea = document.getElementById("userInput");
    const message = textarea.value.trim();
    if (!message) return;

    addMessage(message, "user");
    textarea.value = "";

    addMessage("🌲 Ranger Pine is thinking…", "ranger");
    const container = document.getElementById("chatMessages");

    try {
        const res = await fetch("/api/ranger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        const bubbles = container.getElementsByClassName("ranger-bubble");
        if (bubbles.length > 0) {
            const lastBubble = bubbles[bubbles.length - 1];
            if (lastBubble.textContent.includes("thinking")) {
                lastBubble.parentElement.remove();
            }
        }

        addMessage(data.response, "ranger");

    } catch (err) {
        console.error(err);
        addMessage("⚠️ Ranger Pine couldn’t connect.", "ranger");
    }
}

function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("Speech recognition not supported.");
        return;
    }

    const recog = new Recognition();
    recog.lang = "en-US";
    recog.continuous = false;          // stop after user finishes speaking
    recog.interimResults = false;      // do NOT return partial results

    let finalTranscript = "";

    recog.onresult = (event) => {
        // ALWAYS use the full final result
        finalTranscript = event.results[event.resultIndex][0].transcript;
        document.getElementById("userInput").value = finalTranscript;
    };

    // Fires when the user stopped making sound
    recog.onspeechend = () => {
        recog.stop();   // stop listening
    };

    // Fires AFTER recognition fully stops
    recog.onend = () => {
        // Only send if we actually captured something
        if (finalTranscript.trim() !== "") {
            sendText();   // SEND ONLY ONCE
        }
    };

    recog.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recog.start();
}


document.addEventListener("DOMContentLoaded", () => {document.getElementById("clearHistoryBtn").addEventListener("click", async () => {
    await fetch("/api/clear_history", { method: "POST" });

    // Reset chat box visually
    document.getElementById("chatMessages").innerHTML = `
        <div class="chat-row ranger">
            <div class="bubble ranger-bubble">
                History cleared! I’m Ranger Pine — how can I help now?
            </div>
        </div>`;
});

    document.getElementById("askBtn").addEventListener("click", sendText);
    document.getElementById("voiceBtn").addEventListener("click", startListening);
    document.getElementById("askTripBtn").addEventListener("click", () => {
    const startLocation = document.getElementById("startLocation").value.trim() || "my home";
    const tripDays = document.getElementById("tripDays").value || "5";
    const season = document.getElementById("tripSeason").value.trim() || "this year";
    const budget = document.getElementById("tripBudget").value;
    const vibe = document.getElementById("tripVibe").value.trim() || "classic national park experience";

    const prompt = `Ranger Pine, please suggest a ${tripDays}-day national park trip from ${startLocation} in ${season}.
Budget level: ${budget} 
($ = low cost, $$ = moderate, $$$ = higher comfort).
Traveler vibe: ${vibe}.
Give a clear, simple itinerary with daily structure, parks, and safety tips.`;


    // ✅ Set the prompt into the chat input
    document.getElementById("userInput").value = prompt;

    // ✅ Send the message to the backend
    sendText();
});


    // Carousel logic
    const slides = Array.from(document.querySelectorAll(".carousel-slide"));
    let currentIndex = 0;

    function showSlide(idx) {
        slides.forEach((s, i) => s.classList.toggle("active", i === idx));
    }

    document.getElementById("prevSlide").addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
    });

    document.getElementById("nextSlide").addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    });

    document.getElementById("askAboutParkBtn").addEventListener("click", () => {
        const activeSlide = slides[currentIndex];
        const parkName = activeSlide.querySelector("h4").textContent;
        const prompt = `Ranger Pine, tell me about ${parkName}: best times to visit, must-see locations, and safety tips.`;
        document.getElementById("userInput").value = prompt;
        sendText();
    });

    // Light/Dark theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => {
        const current = document.body.getAttribute("data-theme");
        document.body.setAttribute("data-theme", current === "dark" ? "light" : "dark");
    });

    // Default theme
    document.body.setAttribute("data-theme", "light");
});
