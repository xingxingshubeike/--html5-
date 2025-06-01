// Example1/js/gates/swap_gate.js

const SWAP_Gate = new GateBuilder()
  .setId("SWAP") // Unique ID
  .setSymbol("SWAP") // Display symbol as per requirement
  .setName("SWAP Gate")
  .setBlurb(
    "Swaps the state of two qubits. Requires two SWAP gates in the same column to activate."
  )
  // No matrix defined here as its operation is context-dependent (column-wise)
  .setHeight(1) // SWAP gate acts on a single wire slot visually
  .build();

const GATE_DEFINITIONS_SWAP = {
  SWAP: SWAP_Gate, // Use ID for the key to avoid conflict if symbol 'X' is used elsewhere
};
