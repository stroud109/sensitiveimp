/*********************************************************************************
PIR motion sensor device code written in Squirrel

For more information on connecting a PIR sensor, check out the following two links:
http://electricimp.com/docs/api/hardware/pin/read/
http://codergirljp.blogspot.com/2014/01/electric-imp-hello-world-motion-sensor.html

*********************************************************************************/

// Log a "hello world" statement to make sure you're online.
// This should show up in the Imp IDE logs.
server.log("hello from the device!")

// Assign pin1 to your PIR sensor. This is important because pin1 supports
// wake-from-sleep (which allows you to avoid looping).
pir_sensor <- hardware.pin1;

// I assigned my LED to pin5, but this is arbitrary.
led <- hardware.pin5;

// `motionDetected` will be called each time the PIR sensor's state
// changes (so, for both "on" and "off" states). We're going to do all
// our LED state and logging work in here.
function motionDetected() {
    local pir_state = pir_sensor.read();

    // Trigger a "motion" event that is captured by the agent.
    // The agent should handle this event by sending data to KeenIO.
    agent.send("motion", pir_state);

    // Turn the LED on when motion is detected, and off when motion ends.
    // `pir_state` is a boolean value, so it works to write to DIGITAL_OUT.
    led.write(pir_state);

    // Finally, let's log some human readable statements that reflect the state of movement.
    if (pir_state) {
        server.log("Motion detected!");
    } else {
        server.log("Motion Ended");
    }
}

// Configure your LED for DIGITAL_OUT and your PIR sensor (pin1) for DIGITAL_IN_WAKEUP.
// For more info, check out: http://electricimp.com/docs/api/hardware/pin/configure/
led.configure(DIGITAL_OUT);
pir_sensor.configure(DIGITAL_IN_WAKEUP, motionDetected);

// Start the LED in the off position.
led.write(0);
