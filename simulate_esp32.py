import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
import json
import os
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_ENTRADA = os.getenv("MQTT_TOPIC_ENTRADA", "parking_tech_unq/barrera/entrada/control")

def on_connect(client, userdata, flags, rc, properties=None):
    print(f"[*] Simulación ESP32 conectada al Broker ({MQTT_BROKER})")
    print(f"[*] Suscribiéndose a: {MQTT_TOPIC_ENTRADA}")
    client.subscribe(MQTT_TOPIC_ENTRADA)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        print(f"\n[BARRERA] Mensaje recibido!")
        print(f" > Comando: {data.get('command')}")
        print(f" > Patente: {data.get('plate')}")
        
        if data.get('command') == "OPEN":
            print(" >>> [ACCION] Abriendo servomotor SG90... [OK]")
    except Exception as e:
        print(f"Error procesando mensaje: {e}")

client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message

print("[!] Iniciando simulador de hardware ESP32...")
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
