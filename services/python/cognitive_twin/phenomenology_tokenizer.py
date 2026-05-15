# phenomenology_tokenizer.py
import re
from collections import Counter

class PhenomenologyTokenizer:
    @staticmethod
    def tokenize(text: str) -> dict:
        tokens = []
        pattern = r'(\w+(?:-\w+)*)|([.,!?;:]+)|(\.{3,})|([A-Z]{2,})|(.)'
        for match in re.finditer(pattern, text):
            word = match.group(1)
            punct = match.group(2)
            ellipsis = match.group(3)
            allcaps = match.group(4)
            other = match.group(5)
            if word:
                intensity = 1.0
                if re.search(r'(.)\1{3,}', word):
                    intensity += 0.3
                tokens.append({'type': 'word', 'value': word, 'intensity': intensity})
            elif punct:
                intensity = 0.5 if punct in '.!?' else 0.2
                tokens.append({'type': 'punct', 'value': punct, 'intensity': intensity})
            elif ellipsis:
                tokens.append({'type': 'pause', 'value': '...', 'intensity': 0.8})
            elif allcaps:
                tokens.append({'type': 'emphasis', 'value': allcaps, 'intensity': 1.5})
            elif other and other.strip():
                tokens.append({'type': 'symbol', 'value': other, 'intensity': 0.3})

        bursts = []
        current_burst = []
        for token in tokens:
            if token['type'] == 'word':
                current_burst.append(token['value'])
            elif token['type'] == 'pause' and token['intensity'] > 0.6:
                if current_burst:
                    bursts.append(' '.join(current_burst))
                    current_burst = []
        if current_burst:
            bursts.append(' '.join(current_burst))
        avg_burst_len = sum(len(b.split()) for b in bursts) / max(1, len(bursts))

        auto_interrupt = len(re.findall(r'\b\w+[-–]\s+', text)) + len(re.findall(r'\.\.\.\s*\w', text))

        depth = 0
        max_depth = 0
        for ch in text:
            if ch in '([{':
                depth += 1
                max_depth = max(max_depth, depth)
            elif ch in ')]}':
                depth = max(0, depth-1)

        topic_shifts = len(re.findall(r'\b(pero|sin embargo|no obstante|aunque|por otro lado)\b', text.lower()))
        metaphors = len(re.findall(r'\b(como|tal cual|así como|semejante a)\b', text.lower()))

        return {
            'tokens': tokens,
            'burst_length_avg': avg_burst_len,
            'auto_interruptions': auto_interrupt,
            'nesting_depth': max_depth,
            'topic_bifurcation_rate': topic_shifts / max(1, len(tokens)),
            'metaphor_compression': metaphors / max(1, len(tokens))
        }
