let allProducts = [];

const brandFilter = document.getElementById('brand-filter');
const typeFilter = document.getElementById('type-filter');
const grid = document.getElementById('product-grid');

// ✅ Extracted render function
function render(products) {
    grid.innerHTML = ''; // clear existing items

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-blue-50 rounded-xl shadow p-6 flex flex-col items-center text-center';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="rounded-xl h-64 w-64 object-contain mb-4">
            <h3 class="text-xl font-semibold">${product.name}</h3>
            <p class="text-sm text-blue-700">Brand: ${product.brand}</p>
            <p class="text-sm text-blue-700">Type: ${product.type}</p>
        `;
        grid.appendChild(card);
    });
}

function applyFilters() {
    const brand = brandFilter.value;
    const type = typeFilter.value;

    const filtered = allProducts.filter(p => {
        const matchesBrand = brand === '' || p.brand === brand;
        const matchesType = type === '' || p.type === type;
        return matchesBrand && matchesType;
    });

    render(filtered);
}

fetch('products/products.json')
    .then(res => res.json())
    .then(products => {
        allProducts = products;

        // Populate dropdowns
        const brands = [...new Set(products.map(p => p.brand))];
        const types = [...new Set(products.map(p => p.type))];

        brands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = b;
            brandFilter.appendChild(opt);
        });

        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = t;
            typeFilter.appendChild(opt);
        });

        // Initial render
        render(allProducts);
    });

// ✅ Add listeners
brandFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);
