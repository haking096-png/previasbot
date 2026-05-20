/**
 * Censura palavras pesadas substituindo uma letra por *
 * Ex: "cuzinho" -> "c*zinho", "buceta" -> "buc*ta"
 */

const WORD_MAP: Record<string, string> = {
  // Cada entrada: palavra original -> versão censurada
  'cuzinho': 'c*zinho',
  'cuzinha': 'c*zinha',
  'cu': 'c*',
  'buceta': 'buc*ta',
  'bucetinha': 'buc*tinha',
  'piroca': 'pir*ca',
  'pirocao': 'pir*cao',
  'pirocão': 'pir*cão',
  'rola': 'r*la',
  'roludo': 'r*ludo',
  'roluda': 'r*luda',
  'pica': 'p*ca',
  'picao': 'p*cao',
  'picão': 'p*cão',
  'xereca': 'xer*ca',
  'xerequinha': 'xer*quinha',
  'ppk': 'p*k',
  'ppka': 'p*ka',
  'puta': 'put*',
  'putinha': 'put*nha',
  'putaria': 'put*ria',
  'safada': 'saf*da',
  'safado': 'saf*do',
  'safadinha': 'saf*dinha',
  'safadinho': 'saf*dinho',
  'gozar': 'goz*r',
  'goza': 'goz*',
  'gozada': 'goz*da',
  'gozei': 'goz*i',
  'gozando': 'goz*ndo',
  'foder': 'fod*r',
  'fode': 'fod*',
  'fodendo': 'fod*ndo',
  'fodida': 'fod*da',
  'fodido': 'fod*do',
  'tesao': 'tes*o',
  'tesão': 'tes*o',
  'punheta': 'punh*ta',
  'siririca': 'sirir*ca',
  'chupeta': 'chup*ta',
  'chupar': 'chup*r',
  'chupa': 'chup*',
  'chupando': 'chup*ndo',
  'mamada': 'mam*da',
  'mamar': 'mam*r',
  'mama': 'mam*',
  'mamando': 'mam*ndo',
  'pau': 'p*u',
  'pauzao': 'p*uzao',
  'pauzão': 'p*uzão',
  'rabao': 'rab*o',
  'rabão': 'rab*o',
  'bundao': 'bund*o',
  'bundão': 'bund*o',
  'bunduda': 'bund*da',
  'peitos': 'peit*s',
  'peitao': 'peit*o',
  'peitão': 'peit*o',
  'peituda': 'peit*da',
  'vagina': 'vag*na',
  'penis': 'pen*s',
  'pênis': 'pên*s',
  'anal': 'an*l',
  'orgasmo': 'org*smo',
  'transar': 'trans*r',
  'transa': 'trans*',
  'transando': 'trans*ndo',
  'meter': 'met*r',
  'metendo': 'met*ndo',
  'metida': 'met*da',
  'sentando': 'sent*ndo',
  'sentar': 'sent*r',
  'senta': 'sent*',
  'cavalgar': 'cavalg*r',
  'cavalgando': 'cavalg*ndo',
  'cavalga': 'cavalg*',
  'gemendo': 'gem*ndo',
  'gemer': 'gem*r',
  'geme': 'gem*',
  'molhada': 'molh*da',
  'molhadinha': 'molh*dinha',
  'excitada': 'excit*da',
  'excitado': 'excit*do',
  'tesuda': 'tes*da',
  'tesudo': 'tes*do',
  'delicia': 'delic*a',
  'delícia': 'delíc*a',
  'gostosa': 'gost*sa',
  'gostoso': 'gost*so',
  'gostosinha': 'gost*sinha',
  'nua': 'nu*',
  'nuas': 'nu*s',
  'nudes': 'nud*s',
  'nude': 'nud*',
  'pelada': 'pel*da',
  'pelado': 'pel*do',
  'peladinha': 'pel*dinha',
};

// Sort by length descending so longer words match first
const sortedWords = Object.keys(WORD_MAP).sort((a, b) => b.length - a.length);

export function censorText(text: string): string {
  let result = text;

  for (const word of sortedWords) {
    const regex = new RegExp(`(?<![a-zA-ZÀ-ÿ])${escapeRegex(word)}(?![a-zA-ZÀ-ÿ])`, 'gi');
    result = result.replace(regex, (match) => {
      const replacement = WORD_MAP[word.toLowerCase()];
      if (!replacement) return match;

      if (match === match.toUpperCase()) {
        return replacement.toUpperCase();
      }
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
