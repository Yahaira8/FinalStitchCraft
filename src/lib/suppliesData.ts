export type SupplyCategory = 'washers' | 'yarns' | 'stuffing';

export interface SupplyComparisonItem {
  id: string;
  category: SupplyCategory;
  name: string;
  metrics: {
    label: string;
    value: string;
  }[];
  bestFor: string;
  proTip: string;
}

export const SUPPLY_CATEGORIES: { id: SupplyCategory; label: string }[] = [
  { id: 'washers', label: 'Safety Eye Washers' },
  { id: 'yarns', label: 'Yarn Weights & Stitch Density' },
  { id: 'stuffing', label: 'Poly-Fil & Stuffing' },
];

export const SUPPLIES_DATA: SupplyComparisonItem[] = [
  {
    id: 'flat-plastic-washer',
    category: 'washers',
    name: 'Standard Flat Plastic Washer',
    metrics: [
      { label: 'Grip Strength', value: 'Moderate' },
      { label: 'Eye Profile', value: 'Flush with stitch surface' },
      { label: 'Installation', value: 'Snap flat side toward eye post' },
      { label: 'Removable', value: 'Difficult without cutting post' },
    ],
    bestFor: 'Tight cotton or worsted acrylic stitches (#1–#4)',
    proTip: 'Avoid on loose chenille plush loops where the washer rim can pull through.',
  },
  {
    id: 'sinker-cupped-washer',
    category: 'washers',
    name: 'Sinker / Cupped Safety Washer',
    metrics: [
      { label: 'Grip Strength', value: 'High (recesses eye into head)' },
      { label: 'Eye Profile', value: 'Slightly sunken, sculpted look' },
      { label: 'Installation', value: 'Cupped rim faces away from eye post' },
      { label: 'Removable', value: 'Requires washer tool or pliers' },
    ],
    bestFor: 'Chunky & Super Bulky plush chenille (#5–#6)',
    proTip: 'Warm plastic washers slightly in hot water for 10 seconds if stiff to press.',
  },
  {
    id: 'metal-star-washer',
    category: 'washers',
    name: 'Metal Locking Star Washer',
    metrics: [
      { label: 'Grip Strength', value: 'Maximum (permanent metal teeth)' },
      { label: 'Eye Profile', value: 'Ultra-tight flush lock' },
      { label: 'Installation', value: 'Press flat using a hollow pen barrel' },
      { label: 'Removable', value: 'Permanent once seated' },
    ],
    bestFor: 'Display pieces and dense cotton amigurumi needing rigid hold',
    proTip: 'Double-check eye symmetry before pressing because metal teeth lock permanently.',
  },
  {
    id: 'cotton-fine',
    category: 'yarns',
    name: 'Fingering / Sport Cotton (#1–#2)',
    metrics: [
      { label: 'Stitch Definition', value: 'Crisp & architectural' },
      { label: 'Stuffing Visibility', value: 'Nearly zero' },
      { label: 'Recommended Hook', value: '2.0mm – 2.5mm' },
      { label: 'Washer Match', value: 'Standard Flat or Metal Star' },
    ],
    bestFor: 'Keychains, detailed mini dolls, and display desk companions',
    proTip: 'Use yarn-under (YU) single crochet for uniform X-shaped stitches.',
  },
  {
    id: 'worsted-4',
    category: 'yarns',
    name: 'Worsted Acrylic / Cotton (#4)',
    metrics: [
      { label: 'Stitch Definition', value: 'Balanced & beginner-friendly' },
      { label: 'Stuffing Visibility', value: 'Low with 3.5mm hook' },
      { label: 'Recommended Hook', value: '3.5mm – 4.0mm' },
      { label: 'Washer Match', value: 'Standard Flat or Sinker Washer' },
    ],
    bestFor: 'All-around amigurumi animals, frogs, bees, and axolotls',
    proTip: 'Drop 1.0–1.5mm below the yarn label hook recommendation for zero gaps.',
  },
  {
    id: 'super-bulky-6',
    category: 'yarns',
    name: 'Super Bulky Plush Chenille (#6)',
    metrics: [
      { label: 'Stitch Definition', value: 'Soft & fuzzy (loops hidden)' },
      { label: 'Stuffing Visibility', value: 'Moderate if tension is loose' },
      { label: 'Recommended Hook', value: '5.0mm – 6.0mm' },
      { label: 'Washer Match', value: 'Sinker / Cupped Washer (10mm+)' },
    ],
    bestFor: 'Huggable plush sea turtles, whales, and oversized gifts',
    proTip: 'Place stitch markers in Round 1 and avoid pulling magic rings too aggressively.',
  },
  {
    id: 'standard-polyfil',
    category: 'stuffing',
    name: 'Standard Poly-Fil Fiberfill',
    metrics: [
      { label: 'Loft & Bounce', value: 'Medium-high' },
      { label: 'Washability', value: 'Machine washable (gentle)' },
      { label: 'Shape Retention', value: 'Molds smoothly into small limbs' },
      { label: 'Cost Efficiency', value: 'High' },
    ],
    bestFor: 'General amigurumi bodies, heads, and narrow limbs',
    proTip: 'Pull apart small tufts before inserting rather than shoving in dense clumps.',
  },
  {
    id: 'cluster-fiberfill',
    category: 'stuffing',
    name: 'Cluster Fiberfill (Silicone-Coated)',
    metrics: [
      { label: 'Loft & Bounce', value: 'High bounce, resists clumping' },
      { label: 'Washability', value: 'Machine washable' },
      { label: 'Shape Retention', value: 'Springs back after squishing' },
      { label: 'Cost Efficiency', value: 'Moderate' },
    ],
    bestFor: 'Large chunky plushies made with #5–#6 chenille yarn',
    proTip: 'Great for squeezable plushies that kids or pets cuddle daily.',
  },
  {
    id: 'weighted-pellets',
    category: 'stuffing',
    name: 'Weighted Poly-Pellets (in Nylon Pouch)',
    metrics: [
      { label: 'Loft & Bounce', value: 'Zero (adds base gravity)' },
      { label: 'Washability', value: 'Hand wash recommended' },
      { label: 'Shape Retention', value: 'Anchors bottom center of gravity' },
      { label: 'Cost Efficiency', value: 'Moderate' },
    ],
    bestFor: 'Sitting plushies like Fergus the Frog, Mini Dino, and Octopus',
    proTip: 'Always seal pellets inside a tied knee-high nylon stocking before inserting.',
  },
];
