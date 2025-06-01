// js/gates/display_gates.js

const AmplitudeDisplay = new GateBuilder()
  .setSymbol("Amps")
  .setName("Amplitude Display")
  .setBlurb("Shows state amplitudes")
  .markAsDisplayGate()
  .setHeight(1) // Default to 1, can be resized
  .build();

const ProbabilityDisplay = new GateBuilder()
  .setSymbol("Prob")
  .setName("Probability Display")
  .setBlurb("Shows measurement probabilities")
  .markAsDisplayGate()
  .setHeight(1) // Default to 1, can be resized
  .build();

const BlochSphereDisplay = new GateBuilder()
  .setSymbol("Bloch")
  .setName("Bloch Sphere")
  .setBlurb("Displays single qubit state on Bloch sphere")
  .markAsDisplayGate()
  .setHeight(1)
  .build();

const GATE_DEFINITIONS_DISPLAY = {
  Amplitude: AmplitudeDisplay,
  Probability: ProbabilityDisplay,
  Bloch: BlochSphereDisplay,
};
