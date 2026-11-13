#include <Wire.h>
#include <MAX30105.h>
#include <heartRate.h>
#include <Adafruit_TMP117.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

constexpr int SDA_PIN = 21;
constexpr int SCL_PIN = 22;
constexpr uint32_t REPORT_INTERVAL_MS = 1000;
constexpr uint32_t BEAT_TIMEOUT_MS = 3000;

// Starting value for bench testing. Tune it for your sensor and enclosure.
constexpr uint32_t CONTACT_IR_THRESHOLD = 50000;

MAX30105 optical;
Adafruit_TMP117 thermometer;
Adafruit_MPU6050 motion;

bool opticalReady = false;
bool thermometerReady = false;
bool motionReady = false;
bool opticalContact = false;

uint32_t lastBeatMs = 0;
uint32_t lastReportMs = 0;
float pulseBpm = NAN;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  opticalReady = optical.begin(Wire);
  if (opticalReady) {
    // LED power, sample averaging, red + IR, sample rate, pulse width, ADC range.
    optical.setup(0x1F, 1, 2, 100, 411, 4096);
  }

  thermometerReady = thermometer.begin(0x48, &Wire);
  motionReady = motion.begin(0x68, &Wire);

  if (!opticalReady) Serial.println("# MAX30102 missing at 0x57");
  if (!thermometerReady) Serial.println("# TMP117 missing at 0x48");
  if (!motionReady) Serial.println("# MPU6050 missing at 0x68");

  Serial.println(
    "uptime_ms,optical_contact,pulse_bpm_estimate,"
    "contact_temp_c,ax_m_s2,ay_m_s2,az_m_s2"
  );
}

void updatePulse() {
  if (!opticalReady) return;

  optical.check();
  while (optical.available()) {
    const uint32_t ir = optical.getFIFOIR();
    optical.nextSample();

    // Feed every sample to the beat detector so its filter stays current.
    const bool beatDetected = checkForBeat(ir);
    opticalContact = ir >= CONTACT_IR_THRESHOLD;

    if (!opticalContact) {
      lastBeatMs = 0;
      pulseBpm = NAN;
      continue;
    }

    if (!beatDetected) continue;

    const uint32_t now = millis();

    if (lastBeatMs != 0) {
      const uint32_t intervalMs = now - lastBeatMs;

      // Ignore close peaks without resetting the previous beat timestamp.
      if (intervalMs < 300) continue;

      pulseBpm = intervalMs <= 2000 ? 60000.0f / intervalMs : NAN;
    }

    lastBeatMs = now;
  }

  if (lastBeatMs != 0 && millis() - lastBeatMs > BEAT_TIMEOUT_MS) {
    lastBeatMs = 0;
    pulseBpm = NAN;
  }
}

void printValue(float value, int decimals) {
  if (isfinite(value)) Serial.print(value, decimals);
}

void reportReadings(uint32_t now) {
  float contactTempC = NAN;
  float ax = NAN;
  float ay = NAN;
  float az = NAN;

  if (thermometerReady) {
    sensors_event_t temperature;
    if (thermometer.getEvent(&temperature)) {
      contactTempC = temperature.temperature;
    }
  }

  if (motionReady) {
    sensors_event_t acceleration, gyro, temperature;
    if (motion.getEvent(&acceleration, &gyro, &temperature)) {
      ax = acceleration.acceleration.x;
      ay = acceleration.acceleration.y;
      az = acceleration.acceleration.z;
    }
  }

  Serial.print(now);
  Serial.print(',');
  if (opticalReady) Serial.print(opticalContact ? 1 : 0);
  Serial.print(',');
  printValue(pulseBpm, 1);
  Serial.print(',');
  printValue(contactTempC, 2);
  Serial.print(',');
  printValue(ax, 2);
  Serial.print(',');
  printValue(ay, 2);
  Serial.print(',');
  printValue(az, 2);
  Serial.println();
}

void loop() {
  updatePulse();

  const uint32_t now = millis();
  if (now - lastReportMs >= REPORT_INTERVAL_MS) {
    lastReportMs = now;
    reportReadings(now);
  }

  delay(2);
}
