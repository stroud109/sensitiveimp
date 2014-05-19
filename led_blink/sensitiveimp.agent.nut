// Log a "hello world" statement to make sure you're online.
// This should show up in the Imp IDE logs.
server.log("Hello from the agent");

// Register a listener for `led` sent from the device.
// We're logging this message to the IDE logs to test device-to-agent communication.
device.on("led", function(state) {server.log(state)})
