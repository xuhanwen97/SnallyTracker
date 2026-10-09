// Snally Hoard lore: award (DMV cryptid) and tent (festival monster) text.
window.SNALLY_LORE = {
  awards: {
    snallygaster: {
      emoji: "👑", name: "The Snallygaster",
      story: "A one-eyed, tentacled dragon-bird of Frederick County, MD. German settlers in the 1700s called it Schneller Geist (“quick spirit”); in 1909 newspapers reported it swooping on farms, and the Smithsonian supposedly offered a reward for its hide.",
    },
    chessie: {
      emoji: "🌊", name: "Chessie",
      story: "The Chesapeake Bay's own sea serpent — dozens of sightings in the '70s and '80s and a 1982 video off Kent Island. It drinks the whole bay.",
    },
    goatman: {
      emoji: "🔥", name: "Goatman",
      story: "Half man, half goat, axe in hand, haunting Fletchertown Road in Prince George's County. Legend says he's an experiment gone wrong at the Beltsville agricultural lab.",
    },
    bunnyman: {
      emoji: "🐰", name: "Bunnyman",
      story: "A figure in a bunny suit said to lurk at the Colchester Overpass in Clifton, VA, every Halloween. Looks cuddly. Is not.",
    },
  },
  // Order here is the order of the Field Guide.
  tents: {
    "Rodan":      { emoji: "🦅", blurb: "Toho's giant pterosaur (1956). Flies at supersonic speed; the wind off its wings flattens cities." },
    "Gargoyle":   { emoji: "🗿", blurb: "Stone grotesques that guard Gothic cathedrals — DC's National Cathedral has 100+ (including Darth Vader). Said to wake at night." },
    "Nessie":     { emoji: "🦕", blurb: "The Loch Ness Monster. Famous 1934 ‘surgeon's photo’ turned out to be a toy sub with a sculpted head." },
    "Mothra":     { emoji: "🦋", blurb: "Giant moth kaiju (1961), guardian of Infant Island, summoned by the song of twin tiny fairies." },
    "Kraken":     { emoji: "🐙", blurb: "Norse sea beast so big sailors mistook it for an island — right before it dragged their ship under." },
    "Poseidon":   { emoji: "🔱", blurb: "Greek god of the sea, earthquakes and horses. Trident-wielder, short temper." },
    "Cyclops":    { emoji: "👁️", blurb: "One-eyed giants of Greek myth; Polyphemus trapped Odysseus in his cave. Snally's one-eyed cousins." },
    "Jabberwock": { emoji: "🐲", blurb: "Lewis Carroll's 1871 beast ‘with eyes of flame’; jaws that bite, claws that catch. Slain by a vorpal blade." },
    "Demogorgon": { emoji: "🌺", blurb: "Faceless, petal-mouthed hunter from the Upside Down, named after a demon prince from D&D." },
    "Medusa":     { emoji: "🐍", blurb: "The Gorgon with snakes for hair; one look turns you to stone." },
    "Brewers Lounge": { emoji: "🍻", blurb: "Behind-the-scenes taps.", hiddenUnlessPoured: true },
    "Volunteer":  { emoji: "🙋", blurb: "Behind-the-scenes taps.", hiddenUnlessPoured: true },
  },
  // Rating slider labels: first entry whose `min` is <= the rating wins.
  ratings: [
    { min: 4.6, label: "whale!", emoji: "🐋" },
    { min: 4.0, label: "great", emoji: "🤩" },
    { min: 3.0, label: "solid", emoji: "👍" },
    { min: 2.0, label: "meh", emoji: "😐" },
    { min: 0,   label: "drain pour", emoji: "🚽" },
  ],
};
