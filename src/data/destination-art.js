// Capa visual de cada destino.
// `photo` só aparece quando a fotografia licenciada mostra de fato aquele lugar
// (ver o texto alternativo em images.json). Os demais destinos recebem um cartão-postal
// tipográfico com o nome em japonês, evitando repetir a mesma foto em vários cartões.
export const destinationArt = {
  tokyo: { jp: '東京', photo: 'tokyo' },
  yokohama: { jp: '横浜' },
  nikko: { jp: '日光' },
  kawaguchiko: { jp: '河口湖' },
  fujiq: { jp: '富士急' },
  osaka: { jp: '大阪', photo: 'osaka' },
  kyoto: { jp: '京都', photo: 'hero' },
  nara: { jp: '奈良' },
  kobe: { jp: '神戸' },
  usj: { jp: 'USJ' },
  nagano: { jp: '長野' },
  hakuba: { jp: '白馬' },
  kanazawa: { jp: '金沢' },
  takayama: { jp: '高山' },
  sapporo: { jp: '札幌' },
  otaru: { jp: '小樽' },
  furano: { jp: '富良野' },
  biei: { jp: '美瑛', photo: 'winter' },
  naha: { jp: '那覇' },
  onna: { jp: '恩納' },
  ishigaki: { jp: '石垣' },
  miyakojima: { jp: '宮古島', photo: 'summer' },
  fukuoka: { jp: '福岡' },
  beppu: { jp: '別府' },
  yufuin: { jp: '由布院' },
  aomori: { jp: '青森' },
  sendai: { jp: '仙台' },
  hiroshima: { jp: '広島' },
  miyajima: { jp: '宮島' },
};
export const regionSlug = (region = '') =>
  region
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '-');
