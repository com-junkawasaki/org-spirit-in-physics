import json

with open('dataset/participants/25111604-c7db-4bfd-8662-e55060e332d6/session_data.json', 'r') as f:
    data = json.load(f)

words = {}
for event in data['events']:
    if event['type'] == 'word_displayed':
        payload = event['payload']
        if 'key' in payload and 'word' in payload:
            words[int(payload['key'])] = payload['word']

sorted_words = dict(sorted(words.items()))
print(json.dumps(sorted_words, ensure_ascii=False, indent=2))

