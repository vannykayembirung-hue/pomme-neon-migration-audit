export type Locale = 'us' | 'uk'
export type Mood = 'cosy' | 'fresh' | 'energised' | 'easy'
export type Avoid = 'meat' | 'fish' | 'mushroom' | 'cilantro' | 'spicy' | 'dairy'
export type Aisle = 'produce' | 'protein' | 'dairy' | 'bakery' | 'pantry' | 'frozen'

export type Ingredient = {
  key: string
  us: string
  uk?: string
  aisle: Aisle
  staple?: boolean
}

export type Recipe = {
  id: string
  name: { us: string; uk?: string }
  time: number
  costPerServingUsd: number
  moods: Mood[]
  contains: Avoid[]
  makesLeftovers: boolean
  image: string
  ingredients: Ingredient[]
}

const i = (
  key: string,
  aisle: Aisle,
  us: string,
  uk?: string,
  staple = false,
): Ingredient => ({ key, aisle, us, uk, staple })

const garlic = i('garlic', 'produce', 'Garlic')
const ginger = i('ginger', 'produce', 'Fresh ginger')
const onion = i('onion', 'produce', 'Yellow onion', 'Brown onion')
const lemon = i('lemon', 'produce', 'Lemons')
const mint = i('mint', 'produce', 'Fresh mint')
const spinach = i('spinach', 'produce', 'Baby spinach')
const scallions = i('scallions', 'produce', 'Scallions', 'Spring onions')
const parmesan = i('parmesan', 'dairy', 'Parmesan')
const rice = i('rice', 'pantry', 'Jasmine rice')
const chicken = i('chicken-thighs', 'protein', 'Boneless chicken thighs')
const oliveOil = i('olive-oil', 'pantry', 'Olive oil', undefined, true)
const soy = i('soy', 'pantry', 'Soy sauce', undefined, true)

export const RECIPES: Recipe[] = [
  {
    id: 'miso-salmon',
    name: { us: 'Miso-honey salmon traybake' },
    time: 25,
    costPerServingUsd: 6.5,
    moods: ['fresh', 'energised'],
    contains: ['fish'],
    makesLeftovers: false,
    image: '/images/recipes/miso-salmon.webp',
    ingredients: [
      i('salmon', 'protein', 'Salmon fillets'),
      i('miso', 'pantry', 'White miso paste'),
      i('honey', 'pantry', 'Honey', undefined, true),
      i('broccolini', 'produce', 'Broccolini', 'Tenderstem broccoli'),
      scallions,
      rice,
      soy,
    ],
  },
  {
    id: 'crispy-gnocchi',
    name: { us: 'Crispy gnocchi with burst tomatoes' },
    time: 20,
    costPerServingUsd: 3.2,
    moods: ['cosy', 'easy'],
    contains: ['dairy'],
    makesLeftovers: false,
    image: '/images/recipes/crispy-gnocchi.webp',
    ingredients: [
      i('gnocchi', 'pantry', 'Potato gnocchi'),
      i('cherry-tomatoes', 'produce', 'Cherry tomatoes'),
      garlic,
      i('basil', 'produce', 'Fresh basil'),
      parmesan,
      oliveOil,
    ],
  },
  {
    id: 'chickpea-curry',
    name: { us: 'Coconut chickpea curry' },
    time: 30,
    costPerServingUsd: 2.6,
    moods: ['cosy'],
    contains: [],
    makesLeftovers: true,
    image: '/images/recipes/chickpea-curry.webp',
    ingredients: [
      i('chickpeas', 'pantry', 'Canned chickpeas', 'Tinned chickpeas'),
      i('coconut-milk', 'pantry', 'Coconut milk'),
      spinach,
      onion,
      garlic,
      ginger,
      i('curry-powder', 'pantry', 'Mild curry powder', undefined, true),
      rice,
    ],
  },
  {
    id: 'chicken-tacos',
    name: { us: 'Chicken & charred corn tacos', uk: 'Chicken & charred sweetcorn tacos' },
    time: 25,
    costPerServingUsd: 4.8,
    moods: ['fresh', 'energised'],
    contains: ['meat', 'cilantro', 'dairy'],
    makesLeftovers: false,
    image: '/images/recipes/chicken-tacos.webp',
    ingredients: [
      chicken,
      i('corn', 'frozen', 'Frozen corn', 'Frozen sweetcorn'),
      i('tortillas', 'bakery', 'Small flour tortillas'),
      i('lime', 'produce', 'Limes'),
      i('cilantro', 'produce', 'Cilantro', 'Coriander'),
      i('avocado', 'produce', 'Avocados'),
      i('sour-cream', 'dairy', 'Sour cream', 'Soured cream'),
    ],
  },
  {
    id: 'shakshuka',
    name: { us: 'Shakshuka with feta & warm flatbread' },
    time: 20,
    costPerServingUsd: 2.9,
    moods: ['cosy', 'easy'],
    contains: ['dairy'],
    makesLeftovers: false,
    image: '/images/recipes/shakshuka.webp',
    ingredients: [
      i('eggs', 'dairy', 'Eggs'),
      i('tomatoes-can', 'pantry', 'Canned crushed tomatoes', 'Tinned chopped tomatoes'),
      i('pepper', 'produce', 'Red bell pepper', 'Red pepper'),
      onion,
      i('feta', 'dairy', 'Feta'),
      i('flatbread', 'bakery', 'Flatbreads'),
      i('paprika', 'pantry', 'Smoked paprika', undefined, true),
    ],
  },
  {
    id: 'lemon-orzo',
    name: { us: 'Lemony orzo with peas & mint' },
    time: 15,
    costPerServingUsd: 2.4,
    moods: ['fresh', 'easy'],
    contains: ['dairy'],
    makesLeftovers: false,
    image: '/images/recipes/lemon-orzo.webp',
    ingredients: [
      i('orzo', 'pantry', 'Orzo'),
      i('peas', 'frozen', 'Frozen peas'),
      lemon,
      mint,
      parmesan,
      oliveOil,
    ],
  },
  {
    id: 'ginger-beef',
    name: { us: 'Sticky ginger beef noodles' },
    time: 15,
    costPerServingUsd: 5.2,
    moods: ['energised', 'easy'],
    contains: ['meat'],
    makesLeftovers: false,
    image: '/images/recipes/ginger-beef.webp',
    ingredients: [
      i('beef', 'protein', 'Flank steak, thinly sliced', 'Beef stir-fry strips'),
      i('noodles', 'pantry', 'Egg noodles'),
      ginger,
      garlic,
      scallions,
      i('bok-choy', 'produce', 'Baby bok choy', 'Pak choi'),
      soy,
    ],
  },
  {
    id: 'squash-halloumi',
    name: { us: 'Roast squash & halloumi grain bowl' },
    time: 35,
    costPerServingUsd: 3.9,
    moods: ['cosy', 'fresh'],
    contains: ['dairy'],
    makesLeftovers: true,
    image: '/images/recipes/squash-halloumi.webp',
    ingredients: [
      i('squash', 'produce', 'Butternut squash'),
      i('halloumi', 'dairy', 'Halloumi'),
      i('quinoa', 'pantry', 'Quinoa'),
      i('arugula', 'produce', 'Arugula', 'Rocket'),
      i('pomegranate', 'produce', 'Pomegranate seeds'),
      i('tahini', 'pantry', 'Tahini'),
      lemon,
    ],
  },
  {
    id: 'mushroom-pasta',
    name: { us: 'Creamy mushroom & spinach pasta' },
    time: 20,
    costPerServingUsd: 3.1,
    moods: ['cosy', 'easy'],
    contains: ['mushroom', 'dairy'],
    makesLeftovers: false,
    image: '/images/recipes/mushroom-pasta.webp',
    ingredients: [
      i('mushrooms', 'produce', 'Cremini mushrooms', 'Chestnut mushrooms'),
      spinach,
      garlic,
      i('cream', 'dairy', 'Heavy cream', 'Double cream'),
      i('rigatoni', 'pantry', 'Rigatoni'),
      parmesan,
    ],
  },
  {
    id: 'harissa-chicken',
    name: { us: 'Harissa chicken with herby couscous' },
    time: 35,
    costPerServingUsd: 4.4,
    moods: ['energised', 'fresh'],
    contains: ['meat', 'spicy', 'dairy'],
    makesLeftovers: true,
    image: '/images/recipes/harissa-chicken.webp',
    ingredients: [
      chicken,
      i('harissa', 'pantry', 'Harissa paste'),
      i('couscous', 'pantry', 'Couscous'),
      i('zucchini', 'produce', 'Zucchini', 'Courgette'),
      lemon,
      mint,
      i('yogurt', 'dairy', 'Greek yogurt', 'Greek yoghurt'),
    ],
  },
]

export const AISLE_LABELS: Record<Aisle, { us: string; uk: string }> = {
  produce: { us: 'Produce', uk: 'Fruit & veg' },
  protein: { us: 'Meat & seafood', uk: 'Meat & fish' },
  dairy: { us: 'Dairy & eggs', uk: 'Dairy & eggs' },
  bakery: { us: 'Bakery', uk: 'Bakery' },
  pantry: { us: 'Pantry', uk: 'Cupboard' },
  frozen: { us: 'Frozen', uk: 'Frozen' },
}

export const AISLE_ORDER: Aisle[] = ['produce', 'protein', 'dairy', 'bakery', 'pantry', 'frozen']

export function localName(value: { us: string; uk?: string }, locale: Locale) {
  return locale === 'uk' && value.uk ? value.uk : value.us
}
