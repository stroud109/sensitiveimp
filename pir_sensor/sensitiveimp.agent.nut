server.log("PIR hello from the agent");

device.on("message", function(message) {server.log(message)})
