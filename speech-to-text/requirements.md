THE FUNCTIONAL REQUIREMENTS FOR THE SPEECH TO TEXT SERVICE

The user must be able to upload mp3 , flav , aac , aaif audios recordings up to 120 mins , that will get transcirbed into text and seen as crudable script ( create , replace , update and delete) that can be used as context for and saved for context summary . the transcription must be able to be added to the big doc as well as pre populate some of the framework sections with information

The user must be able to also record their consultations up to 5 min long , that will only allow them up to 24 recording sessions and must be seen as crudable script and added to the big doc

MAKE SURE TO USE THE WHISPER API TO TRANSCRIBE :

import os
from groq import Groq

client = Groq()
filename = os.path.dirname(__file__) + "/audio.m4a"

with open(filename, "rb") as file:
    transcription = client.audio.transcriptions.create(
      file=(filename, file.read()),
      model="whisper-large-v3-turbo",
      temperature=0,
      response_format="verbose_json",
    )
    print(transcription.text)

import os
from groq import Groq

client = Groq()
filename = os.path.dirname(__file__) + "/audio.m4a"

with open(filename, "rb") as file:
    transcription = client.audio.transcriptions.create(
      file=(filename, file.read()),
      model="whisper-large-v3",
      temperature=0,
      response_format="verbose_json",
    )
    print(transcription.text)

GROQ_API_KEY=your_groq_api_key_here  # Set this in your .env file, never commit real keys
