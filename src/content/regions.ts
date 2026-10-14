/** One-sentence editorial blurbs for the region entries, keyed on region name
 * (case-insensitive). Not in the schema — see also src/content/countries.ts. */
const CONTENT: Record<string, string> = {
  bordeaux: 'Left-bank gravel and right-bank clay; Cabernet and Merlot in negotiated proportion.',
  'burgundy - regional':
    'The umbrella Bourgogne appellations: Pinot Noir, Chardonnay and Aligoté from anywhere in the region.',
  'burgundy - chablis':
    'Chardonnay on Kimmeridgian limestone, in the cool north of Burgundy — tense, saline, and set apart from the Côte d’Or.',
  'burgundy - côte de nuits':
    'The northern Côte d’Or and the red heartland of Burgundy: Pinot Noir from Gevrey to Nuits-Saint-Georges.',
  'burgundy - côte de beaune':
    'The southern Côte d’Or, where the Pinot Noir of Pommard and Volnay gives way to the great Chardonnays of Meursault and Montrachet.',
  'burgundy - côte chalonnaise':
    'A quieter run of hills south of the Côte d’Or — Mercurey, Rully, Givry and Montagny — for Pinot Noir and Chardonnay at an easier price.',
  'burgundy - mâconnais':
    'Chardonnay country on limestone hills in the south, from open Mâcon wines to the rocky slopes of Pouilly-Fuissé.',
  champagne:
    'Chalk subsoil and a cool marginal climate; the reference case for method over ripeness.',
  'loire valley': 'Six hundred kilometres of river and four unrelated grape traditions.',
  'rhône valley': 'Syrah on northern schist terraces; Grenache blends on the southern plain.',
  alsace:
    'Dry-farmed slopes in the rain shadow of the Vosges, planted to aromatic white varieties.',
  provence: 'Limestone and mistral; a rosé tradition older than the wines it is now known for.',
  'south west france': 'Tannat, Malbec and Négrette — the grapes Bordeaux left behind.',
  languedoc:
    'The largest planted area in France, remade from bulk supply to garrigue-scented reds.',
  piedmont: "Nebbiolo on the Tanaro's north bank, fog and marl in equal measure.",
  tuscany: "Sangiovese from Chianti's galestro to the higher, later slopes of Montalcino.",
  veneto: 'Appassimento in the Valpolicella hills; Garganega on the volcanic east.',
  sicily: "Etna's lava terraces alongside the older fortified tradition of the west.",
  'friuli-venezia giulia': 'Ponca marl and a white-wine culture shaped by the Slovenian border.',
  'trentino-alto adige': 'Alpine altitude, steep gradients and the coolest reds in Italy.',
  abruzzo: 'Montepulciano on the Adriatic side of the Apennines, at scale and at height.',
  marche: 'Verdicchio on limestone hills, the longest-lived white of central Italy.',
  puglia: 'Primitivo and Negroamaro on the flat, hot heel — old bush vines, low yields.',
  campania: 'Aglianico on volcanic soils, with Fiano and Greco as the ancient white counterweight.',
  umbria: 'Sagrantino at Montefalco — the most tannic red grape in commercial cultivation.',
  sardinia: 'Cannonau and Vermentino on granite, in near-total isolation from the mainland.',
  lombardy: "Franciacorta's method wines and the terraced Nebbiolo of the Valtellina.",
  'emilia-romagna': 'Lambrusco in its dry form, and Sangiovese on the Romagna side of the divide.',
  lazio: 'Volcanic lake soils around Rome, historically white, increasingly not.',
}

export function regionBlurb(name: string | null | undefined): string | null {
  if (!name) return null
  return CONTENT[name.trim().toLowerCase()] ?? null
}
