#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// --- CONFIGURACIÓN DE RED ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com"; // Mismo que en el .env

// --- TÓPICOS ---
const char* topic_control = "parking/barrera/entrada/control";
const char* topic_status  = "parking/barrera/entrada/status";

// --- PINES ---
const int PIN_SERVO = 13;
const int PIN_TRIG  = 5;
const int PIN_ECHO  = 18;

// --- OBJETOS ---
WiFiClient espClient;
PubSubClient client(espClient);
Servo barrierServo;
LiquidCrystal_I2C lcd(0x27, 16, 2); // Dirección I2C común: 0x27

// --- VARIABLES ---
unsigned long lastMsg = 0;
bool barrierOpen = false;

void setup_wifi() {
  delay(10);
  Serial.println("\nConectando a WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado. IP: " + WiFi.localIP().toString());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensaje recibido en [");
  Serial.print(topic);
  Serial.print("] ");

  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);

  const char* command = doc["command"];
  const char* plate = doc["plate"];

  if (String(command) == "OPEN") {
    openBarrier(plate);
  }
}

void openBarrier(String plate) {
  Serial.println(">>> ABRIENDO BARRERA para: " + plate);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BIENVENIDO!");
  lcd.setCursor(0, 1);
  lcd.print(plate);
  
  barrierServo.write(90); // 90 grados = Abierto
  barrierOpen = true;
  
  // Esperar a que el auto pase (Detección por sensor ultrasonic)
  delay(3000); // Espera mínima
  checkVehiclePassed();
}

void checkVehiclePassed() {
  long duration, distance;
  bool waiting = true;
  
  Serial.println("Esperando que el vehículo pase...");
  
  while(waiting) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);
    
    duration = pulseIn(PIN_ECHO, HIGH);
    distance = (duration / 2) / 29.1;
    
    // Si la distancia es > 20cm, asumimos que el auto ya pasó
    if (distance > 20) {
      delay(1000); // Margen de seguridad
      closeBarrier();
      waiting = false;
    }
    delay(200);
  }
}

void closeBarrier() {
  Serial.println("<<< CERRANDO BARRERA");
  barrierServo.write(0); // 0 grados = Cerrado
  barrierOpen = false;
  mostrarAforoBase();
}

void mostrarAforoBase() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("PARKING TECH");
  lcd.setCursor(0, 1);
  lcd.print("DISPONIBLE");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    if (client.connect("ESP32_Parking_Entrada")) {
      Serial.println("Conectado");
      client.subscribe(topic_control);
      mostrarAforoBase();
    } else {
      Serial.print("Fallo, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // LCD
  lcd.init();
  lcd.backlight();
  lcd.print("Iniciando...");

  // Sensor Ultrasonico
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  // Servo
  barrierServo.attach(PIN_SERVO);
  barrierServo.write(0); // Cerrada al inicio

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}
