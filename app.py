from flask import Flask, request, jsonify, render_template
import requests
import traceback
import os   # <-- required for environment variables

app = Flask(__name__)

# --------------------------------------
# Conversation Memory (for follow-up questions)
# --------------------------------------
conversation_history = []


# --------------------------------------
# AI Park Ranger using Groq API (with memory)
# --------------------------------------
@app.route("/api/ranger", methods=["POST"])
def ranger():
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({"response": "I didn’t quite catch that. What would you like to ask about parks or trips?"})

        # Add user's message to memory
        conversation_history.append({"role": "user", "content": user_message})

        system_prompt = """
        You are Ranger Pine — a friendly, knowledgeable U.S. National Park Ranger.

        RULES:
        - ALWAYS remember earlier messages in this conversation.
        - Use prior answers when the user asks follow-up questions.
        - Keep answers short and easy to scan.
        - Use **bold section titles** and bullet points.
        - Do NOT repeat long lists unless the user asks.
        - Only answer the user's specific question.
        """

        messages = [{"role": "system", "content": system_prompt}] + conversation_history

        # Limit memory (avoid token overload)
        if len(messages) > 12:
            messages = [messages[0]] + messages[-11:]

        # Read API key from environment variables
        api_key = os.environ.get("GROQ_API_KEY")

        if not api_key:
            return jsonify({
                "response": "Groq API key is missing. Add it in Render → Environment Variables."
            })

        # Send request to Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
            },
            timeout=20,
        )

        print("\n🔵 RAW GROQ RESPONSE:")
        print(response.text)

        data = response.json()

        # Handle API errors
        if "error" in data:
            err = data["error"]
            msg = err.get("message", "Unknown Groq error.")
            code = err.get("code", "")

            print("\n⚠️ GROQ API ERROR:", msg)

            if code == "rate_limit_exceeded":
                return jsonify({
                    "response": "Ranger Pine hit the Groq rate limit. Try again in a few seconds."
                })

            return jsonify({
                "response": "Ranger Pine had trouble contacting the AI service. Please try again."
            })

        # Extract AI reply
        if "choices" not in data or not data["choices"]:
            raise ValueError(f"Groq returned no choices: {data}")

        ranger_reply = data["choices"][0]["message"]["content"]

        # Save reply to memory
        conversation_history.append({"role": "assistant", "content": ranger_reply})

        return jsonify({"response": ranger_reply})

    except Exception:
        print("\n🚨🚨 UNEXPECTED ERROR IN /api/ranger 🚨🚨")
        traceback.print_exc()
        print("------------------------------------------------------")
        return jsonify({"response": "Something went wrong. Try again in a moment."})


# --------------------------------------
# Clear Conversation History
# --------------------------------------
@app.route("/api/clear_history", methods=["POST"])
def clear_history():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "cleared"})


# --------------------------------------
# Homepage
# --------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# --------------------------------------
# Run server (for local development)
# --------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
