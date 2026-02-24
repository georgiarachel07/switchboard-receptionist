const scenarios = {
  dental: {
    "Routine cleaning": [
      ["Welcome to the practice. Is this your first visit?", "I’m a new patient."],
      ["Which insurance provider should we record, and what brings you in?", "Self-pay. A routine cleaning."],
      ["What day works for you? Morning or afternoon?", "Tuesday morning."],
      ["I have Tuesday at nine or ten thirty for a one-hour cleaning. Which works better?", ["Nine, please.", "Ten thirty, please."]],
      ["May I have your first and last name, phone number, and email?", "Use the sample contact."],
      ["Shall I reserve that cleaning for you?", "Yes, please."]
    ],
    "Urgent dental pain": [
      ["Thank you for calling. How can I help?", "Severe pain after an injury."],
      ["I understand this needs immediate attention. Where are you, and what number should we call if disconnected?", "Use the sample location and number."],
      ["Would you like the emergency line or a priority message for the team?", ["Transfer me.", "Take a priority message."]]
    ],
    "Booking link": [
      ["Would you like me to find a consultation?", "I’ll need to check my schedule."],
      ["I can text you a booking link. Is this your best mobile number, and may I send it?", ["Yes, send the link.", "No text, thank you."]]
    ]
  },
  auto: {
    "Vehicle drop-off": [
      ["What year, make, and model are you bringing in?", "A 2019 Toyota Corolla."],
      ["What needs attention, and is the car safe to drive or being towed?", "Oil change. It’s drivable."],
      ["Would you prefer a morning or afternoon drop-off, and on which day?", "Wednesday afternoon."],
      ["I can offer Wednesday at one or two fifteen for your fifteen-minute intake.", ["One, please.", "Two fifteen, please."]],
      ["May I have your full name, phone number, and email?", "Use the sample contact."],
      ["Shall I book that drop-off?", "Yes, please."]
    ],
    "Waiting appointment": [
      ["What year, make, and model is the vehicle?", "A 2021 Honda Civic."],
      ["What symptoms are you seeing? Will it arrive by tow?", "Check engine light. Already at the shop."],
      ["Which day and time window should I check for a confirmed service bay?", "Thursday morning."],
      ["The sample bay is available Thursday at nine or eleven. Which do you prefer?", ["Nine, please.", "Eleven, please."]],
      ["May I have your full name, callback number, and email?", "Use the sample contact."],
      ["Shall I book the bay?", "Yes, please."]
    ],
    "Brake failure": [
      ["What happened, and where is the vehicle now?", "The brakes failed. I’m parked."],
      ["Please keep the vehicle parked. What number can our service team use if we disconnect?", "Use the sample number."],
      ["May I connect you to the service advisor?", "Transfer me."]
    ]
  },
  retail: {
    "Stock inquiry": [
      ["Which item or SKU would you like me to check?", "The linen notebook, SKU NOTE-A5."],
      ["The sample inventory shows eight available. Would you like staff to arrange a hold?", ["Request a hold.", "Just checking."]]
    ],
    "Unavailable item": [
      ["Do you have the item description or SKU?", "The navy tote, SKU TOTE-N."],
      ["The sample store has none available. Would you like a callback about restocking?", ["Request a callback.", "No, thank you."]]
    ],
    "Order status": [
      ["How can I help with your order?", "I’d like a delivery update."],
      ["Let me confirm your callback number before connecting you to our orders team.", "Use the sample number."],
      ["May I transfer you now?", "Transfer me."]
    ]
  }
};
const el = id => document.getElementById(id);
let step = 0, script = [], selection = "";
const captions = {dental:"Dental reception", auto:"Service reception", retail:"Store reception"};
function stopAudio() { window.speechSynthesis?.cancel(); }
function writeLine(who, value) {
  const p = document.createElement("p"), label = document.createElement("b");
  label.textContent = who;
  p.className = who === "Caller" ? "caller" : "agent";
  p.append(label, document.createTextNode(value));
  el("lines").append(p);
  el("lines").scrollTop = el("lines").scrollHeight;
  if (who === "Receptionist" && el("read").checked && window.speechSynthesis) {
    stopAudio();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(value));
  }
}
function reset() {
  stopAudio();
  script = []; step = 0; selection = "";
  el("lines").textContent = "Ready for a sample call.";
  el("choices").replaceChildren(); el("outcome").textContent = "";
  el("quote").textContent = "“" + scenarios[el("industry").value][el("scenario").value][0][0] + "”";
  el("caption").textContent = captions[el("industry").value];
}
function setIndustry() {
  el("scenario").replaceChildren(...Object.keys(scenarios[el("industry").value]).map(name => new Option(name,name)));
  reset();
}
function turn() {
  const [phrase, choices] = script[step];
  writeLine("Receptionist", phrase);
  el("choices").replaceChildren(...[choices].flat().map(label => {
    const button = document.createElement("button");
    button.textContent = label;
    button.onclick = () => {
      stopAudio(); writeLine("Caller",label);
      if (label.endsWith(", please.") && !label.startsWith("Yes")) selection = label.split(",")[0].toLowerCase();
      if (++step < script.length) return turn();
      el("choices").replaceChildren();
      const scenario = el("scenario").value;
      const bookings = {"Routine cleaning":["Tuesday","morning","Example Dental, twelve Sample Lane"],"Vehicle drop-off":["Wednesday","afternoon","Example Auto, eight Shop Road"],"Waiting appointment":["Thursday","morning","Example Auto, eight Shop Road"]};
      let message = "Thanks for calling. Have a good day.";
      if (bookings[scenario]) {
        const [day,period,address] = bookings[scenario];
        message = "Your sample appointment is confirmed for "+day+" "+period+" at "+selection+", at "+address+".";
      } else if (label === "Transfer me.") message = "I’ll connect you to the sample staff queue now.";
      else if (label === "Yes, send the link.") message = "The sample SMS workflow has received your booking-link request.";
      else if (/priority|hold|callback/i.test(label)) message = "Your sample request is in the staff queue.";
      writeLine("Receptionist",message);
      el("outcome").textContent = "Sample call complete.";
    };
    return button;
  }));
}
el("industry").onchange = setIndustry; el("scenario").onchange = reset;
el("start").onclick = () => {reset(); el("lines").replaceChildren();script=scenarios[el("industry").value][el("scenario").value];turn();};
el("read").onchange = stopAudio;
if (!window.speechSynthesis) el("read").disabled = true;
for (let i=0;i<40;i++) {
  const bar=document.createElement("i");
  bar.style.height=(10+Math.abs(Math.sin(i*1.7)*Math.cos(i*.13))*88)+"%";
  document.querySelector(".wave").append(bar);
}
setIndustry();
