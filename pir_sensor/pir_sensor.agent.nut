// Log a "hello world" statement to make sure you're online.
// This should show up in the Imp IDE logs.
server.log("PIR hello from the agent");

// Register a listener for `message` sent from the device.
// We're logging the message to the IDE logs to test device-to-agent communication.
device.on("message", function(message) {server.log(message)})
