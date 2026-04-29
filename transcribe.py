import sys
import whisper

def transcribe(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    print(result["text"])

if __name__ == "__main__":
    if len(sys.argv) > 1:
        transcribe(sys.argv[1])
    else:
        print("No audio path provided.")
