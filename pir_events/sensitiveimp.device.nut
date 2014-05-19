// PIR motion sensor

server.log("hello from the device!")

pir_sensor <- hardware.pin1;
led <- hardware.pin5;

led.configure(DIGITAL_OUT);
led.write(0);

function motionDetected()
{
    local pir_state = pir_sensor.read();
    // agent.send("message", format("PIR state is %d", pir_state));
    agent.send("motion", pir_state);
    if (pir_state == 1)
    {
        // LED on when motion is detected
        led.write(1);
        server.log("Motion detected!");
    } else
    {
        // LED off when motion ended
        led.write(0);
        server.log("Motion Ended");
    }
}

pir_sensor.configure(DIGITAL_IN_WAKEUP, motionDetected);
