server.log("Hello from the agent");

device.on("led", function(state) {server.log(state)})
