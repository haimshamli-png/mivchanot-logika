var PIGMENT_MIXING = (function () {
  const RECIPES = {
    'B+Y': 'G',
    'B+R': 'P',
    'G+R': 'K'
  };

  function recipeKey(a, b) {
    return [a, b].sort().join('+');
  }

  function mixPair(a, b) {
    if (!a || !b || a === b || a === 'J' || b === 'J') return null;
    return RECIPES[recipeKey(a, b)] || null;
  }

  return {
    RECIPES,
    mixPair
  };
})();

window.PIGMENT_MIXING = PIGMENT_MIXING;
