const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const UNSPLASH_KEY = 'p18FnZEV9H7PyFn7uRiCnR23UdBrFybmKbtqgMFq0XQ';

let ingredients = [];
let currentRecipes = [];
let currentRecipe = null;

document.addEventListener('DOMContentLoaded', function () {
    const toggler = document.querySelector('.navbar-toggler');
    const menu = document.getElementById('mainNav');

    toggler.style.outline = 'none';
    toggler.style.boxShadow = 'none';

    toggler.addEventListener('click', function () {
        if (window.innerWidth < 992) {
            menu.classList.toggle('show');
        }
    });
});

function showPage(pageId) {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    navLinks.forEach(link => {
        const href = link.getAttribute('onclick');
        if (href && href.includes(pageId)) {
            link.classList.add('active');
        }
    });
}

function addIngredient() {
    const input = document.getElementById('ingredientInput');
    const ingredient = input.value.trim();
    if (ingredient && !ingredients.includes(ingredient)) {
        ingredients.push(ingredient);
        renderIngredients();
        input.value = '';
    }
}

function removeIngredient(index) {
    ingredients.splice(index, 1);
    renderIngredients();
}

function renderIngredients() {
    const container = document.getElementById('ingredientBadgeContainer');
    container.innerHTML = '';
    ingredients.forEach((ingredient, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary py-1 px-2 fw-normal text-dark d-inline-flex align-items-center mb-2 me-2 ingredient-badge';
        badge.style.border = '1px solid #cccccc';
        badge.innerHTML = `
            ${ingredient}
            <button type="button" class="btn-close btn-close-dark btn-sm ms-2 m-0" 
                    style="transform: scale(0.75);" aria-label="Remove" 
                    onclick="removeIngredient(${index})"></button>
        `;
        container.appendChild(badge);
    });
}

function handleEnterKey(event) {
    if (event.key === 'Enter') {
        addIngredient();
    }
}

async function getUnsplashImage(query) {
    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(query)}&client_id=${UNSPLASH_KEY}`);
        const data = await response.json();
        return data.results[0]?.urls?.regular || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300';
    } catch (error) {
        console.error('Error fetching image from Unsplash:', error);
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300';
    }
}

async function searchRecipes() {
    if (ingredients.length === 0) {
        alert('Please add some ingredients first!');
        return;
    }

    showLoading(true);
    
    try {
        const prompt = `Given these ingredients: ${ingredients.join(', ')}, suggest 5 different recipes that can be made using some or all of these ingredients. For each recipe, provide a response in this exact JSON format:
        [
        {
            "title": "Recipe Name",
            "ingredients": [
            "ingredient 1 with quantity",
            "ingredient 2 with quantity"
            ],
            "instructions": [
            "Step 1 instruction",
            "Step 2 instruction"
            ],
            "description": "Brief 2-3 sentence description of the recipe"
        }
        ]
        Make sure the response is valid JSON only, no additional text. Use realistic quantities and detailed instructions.`;

        const requestBody = {
            model: 'deepseek/deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SarapMatch Recipe Generator'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response structure');
        }

        const recipesText = data.choices[0].message.content;
        let recipes;
        try {
            recipes = JSON.parse(recipesText);
        } catch (parseError) {
            const jsonMatch = recipesText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                recipes = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid JSON response from API');
            }
        }

        if (!Array.isArray(recipes) || recipes.length === 0) {
            throw new Error('No valid recipes returned from API');
        }

        for (const recipe of recipes) {
            recipe.image = await getUnsplashImage(recipe.title);
        }

        currentRecipes = recipes;
        renderRecipes(recipes);
        
    } catch (error) {
        console.error('Error fetching recipes:', error);
        let errorMessage = 'Sorry, there was an error finding recipes. ';
        if (error.message.includes('CORS')) {
            errorMessage += 'This might be a browser security issue.';
        } else if (error.message.includes('401')) {
            errorMessage += 'API authentication failed.';
        } else if (error.message.includes('429')) {
            errorMessage += 'Too many requests. Please try again later.';
        } else {
            errorMessage += `Details: ${error.message}`;
        }
        alert(errorMessage);
        showMockRecipes();
    } finally {
        showLoading(false);
    }
}

function showMockRecipes() {
    const mockRecipes = [
        {
            title: "Simple Scrambled Eggs",
            image: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop&auto=format",
            ingredients: [
                "3 large eggs",
                "2 tbsp butter",
                "Salt and pepper to taste",
                "2 tbsp milk (optional)"
            ],
            instructions: [
                "Crack eggs into a bowl and whisk with milk, salt, and pepper",
                "Heat butter in a non-stick pan over medium-low heat",
                "Pour in eggs and let sit for 30 seconds",
                "Gently stir with a spatula, pushing eggs from edges to center",
                "Continue stirring gently until eggs are just set but still creamy",
                "Remove from heat and serve immediately"
            ],
            description: "Creamy, fluffy scrambled eggs made with simple ingredients."
        },
        {
            title: "Basic Pancakes",
            image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&auto=format",
            ingredients: [
                "1 cup all-purpose flour",
                "1 egg",
                "1 cup milk",
                "2 tbsp melted butter",
                "1 tbsp sugar",
                "1 tsp baking powder",
                "1/2 tsp salt"
            ],
            instructions: [
                "Mix dry ingredients in a large bowl",
                "Whisk egg, milk, and melted butter in another bowl",
                "Pour wet ingredients into dry ingredients and stir until just combined",
                "Heat a lightly greased pan over medium heat",
                "Pour 1/4 cup batter for each pancake",
                "Cook until bubbles form on surface, then flip and cook until golden brown"
            ],
            description: "Fluffy, golden pancakes that are perfect for breakfast."
        }
    ];

    const availableIngredients = ingredients.map(ing => ing.toLowerCase());
    const relevantRecipes = mockRecipes.filter(recipe => {
        return recipe.ingredients.some(ingredient => 
            availableIngredients.some(available => 
                ingredient.toLowerCase().includes(available) || 
                available.includes(ingredient.toLowerCase().split(' ')[0])
            )
        );
    });

    currentRecipes = relevantRecipes.length > 0 ? relevantRecipes : mockRecipes.slice(0, 1);
    renderRecipes(currentRecipes);
}

function showLoading(show) {
    const button = document.getElementById('searchButton');
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        button.disabled = true;
        spinner.style.display = 'block';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
    }
}

function renderRecipes(recipes) {
    const container = document.getElementById('recipesContainer');
    const noRecipesMsg = document.getElementById('noRecipesMessage');
    const recipesSection = document.getElementById('recipesSection');
    
    if (!recipes || recipes.length === 0) {
        showNoRecipes();
        return;
    }

    container.innerHTML = '';
    noRecipesMsg.style.display = 'none';
    recipesSection.style.display = 'block';
    
    recipes.forEach((recipe, index) => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="card h-100 px-0 recipe-card">
                <img class="card-img-top img-fluid" src="${recipe.image}" alt="${recipe.title}" style="height: 200px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300'">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${recipe.title}</h5>
                    <p class="card-text">${recipe.description || 'A delicious recipe made with your available ingredients.'}</p>
                    <button class="btn btn-primary mt-auto" onclick="showRecipe(${index})">
                        <i class="fas fa-eye me-1"></i>View Recipe
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function showNoRecipes() {
    const container = document.getElementById('recipesContainer');
    const noRecipesMsg = document.getElementById('noRecipesMessage');
    const recipesSection = document.getElementById('recipesSection');
    container.innerHTML = '';
    noRecipesMsg.style.display = 'block';
    recipesSection.style.display = 'block';
}

function showRecipe(index) {
    currentRecipe = currentRecipes[index];
    document.getElementById('recipeTitle').textContent = currentRecipe.title;
    document.getElementById('recipeImage').src = currentRecipe.image;
    document.getElementById('recipeImage').alt = currentRecipe.title;
    const ingredientsList = document.getElementById('recipeIngredients');
    ingredientsList.innerHTML = '';
    currentRecipe.ingredients.forEach(ingredient => {
        const li = document.createElement('li');
        li.textContent = ingredient;
        ingredientsList.appendChild(li);
    });
    const instructionsList = document.getElementById('recipeInstructions');
    instructionsList.innerHTML = '';
    currentRecipe.instructions.forEach(instruction => {
        const li = document.createElement('li');
        li.textContent = instruction;
        instructionsList.appendChild(li);
    });
    showPage('recipe');
}