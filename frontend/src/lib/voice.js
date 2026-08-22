// Speaking to the configurator.
//
// The design assistant already turns a phrase into a whole specification --
// "red track car" moves paint, wheels, stance, exhaust and the room it stands
// in, all at once. Voice is the same thing with the keyboard removed, which
// matters more than it sounds: describing a car is something people do out
// loud, and typing it is the awkward part.
//
// This uses the browser's own speech recognition. Nothing is sent anywhere by
// this code, though it is worth knowing that Chrome's implementation does the
// recognition on Google's servers -- so the honest thing is to say so on the
// button rather than imply the audio stays local, which is a claim this
// project can make about its vision models but not about this.

const Recognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const supported = () => Boolean(Recognition);

// Why it will not work, in words worth showing someone. Silence is the worst
// possible response to a button that does nothing.
export function unavailableBecause() {
  if (typeof window === "undefined") return "Not running in a browser";
  if (!window.isSecureContext) {
    return "Speech needs a secure connection. This works on https, and on localhost.";
  }
  if (!Recognition) {
    return "This browser has no speech recognition. Chrome and Edge do; Firefox does not.";
  }
  return null;
}

// One listening session. Returns a handle that can be stopped, and reports
// interim results so the page can show words appearing as they are said.
export function listen({ onInterim, onResult, onError, onEnd, language = "en-IN" }) {
  if (!Recognition) {
    onError?.(unavailableBecause());
    return null;
  }

  const recognition = new Recognition();

  recognition.lang = language;
  // Interim results are what make it feel responsive rather than broken: a
  // second of silence with no feedback reads as a failure.
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let settled = false;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }

    if (interim) onInterim?.(interim);

    if (final) {
      settled = true;
      onResult?.(final.trim());
    }
  };

  recognition.onerror = (event) => {
    settled = true;

    // These arrive as terse codes; nobody should have to look them up.
    const said = {
      "not-allowed": "Microphone access was refused. Allow it in the address bar and try again.",
      "service-not-allowed": "The browser blocked speech recognition.",
      "no-speech": "Nothing was heard. Try again a little closer to the microphone.",
      aborted: null,
      network: "Speech recognition could not reach the network."
    }[event.error];

    if (said) onError?.(said);
    else if (event.error !== "aborted") onError?.(`Speech recognition failed (${event.error}).`);
  };

  recognition.onend = () => {
    onEnd?.(settled);
  };

  try {
    recognition.start();
  } catch {
    // Starting one that is already running throws rather than being ignored.
    onError?.("Already listening.");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Stopping one that has already ended is not a problem.
      }
    }
  };
}

// Things worth saying, shown under the button so nobody has to guess at the
// vocabulary. These are phrases the theme matcher already understands.
export const EXAMPLES = [
  "Make it a red track car",
  "Murdered out, blacked windows",
  "Cyberpunk with underglow",
  "Something for the beach at sunset",
  "Lift it, off road tyres"
];
