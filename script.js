document.addEventListener("DOMContentLoaded", () => {
  /* -------------------- Navbar Mobile Menu -------------------- */
  const menuOpenButton = document.querySelector("#menu-open-button");
  const menuCloseButton = document.querySelector("#menu-close-button");

  if (menuOpenButton && menuCloseButton) {
    menuOpenButton.addEventListener("click", () => {
      document.body.classList.toggle("show-mobile-menu");
    });

    menuCloseButton.addEventListener("click", () => {
      document.body.classList.remove("show-mobile-menu");
    });
  }

  /* -------------------- Reviews Slider -------------------- */
  const sliderWrapper = document.querySelector(".slider-wrapper");
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");

  if (sliderWrapper && leftBtn && rightBtn) {
    let currentIndex = 0;

    function updateSlider() {
      const offset = currentIndex * -320; // Adjust based on your CSS width and margin
      sliderWrapper.style.transform = `translateX(${offset}px)`;
    }

    leftBtn.addEventListener("click", () => {
      currentIndex = Math.max(0, currentIndex - 1);
      updateSlider();
    });

    rightBtn.addEventListener("click", () => {
      const reviewCount = document.querySelectorAll(".review").length;
      currentIndex = Math.min(reviewCount - 1, currentIndex + 1);
      updateSlider();
    });
  }

 /* -------------------- Cart Functionality -------------------- */
const cart = [];
const cartCount = document.getElementById("cart-count");
const cartContainer = document.getElementById("cart-container");
const totalPriceElement = document.getElementById("total-price");
const cartModal = document.getElementById("cart-modal");
const checkoutButton = document.getElementById("checkout-button");
const cartCloseButton = document.getElementById("cart-close-button"); // Çarpı butonunun id'si

document.getElementById("cart-link").addEventListener("click", (event) => {
  event.preventDefault();
  cartModal.classList.toggle("hidden");
});

if (cartCloseButton) {
  cartCloseButton.addEventListener("click", () => {
    cartModal.classList.add("hidden"); // Sepet modalını kapat
  });
}

document.getElementById("product-list").addEventListener("click", (event) => {
  if (event.target.classList.contains("add-to-cart")) {
    const button = event.target;
    const productCard = button.closest(".product");
    if (!productCard) return;

    const productId = button.getAttribute("data-id");
    const productName = productCard.querySelector("h3").textContent;
    const productPrice = parseFloat(
      productCard.querySelector("span").textContent.replace("$", "")
    );

    const existingProduct = cart.find((item) => item.id === productId);
    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
    }
    updateCartUI();
  }
});

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  cartCount.classList.toggle("hidden", totalItems === 0);

  cartContainer.innerHTML = "";
  let totalPrice = 0;

  cart.forEach((item) => {
    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");
    cartItem.innerHTML = `<p>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</p>`;
    cartContainer.appendChild(cartItem);
    totalPrice += item.price * item.quantity;
  });

  totalPriceElement.textContent = totalPrice.toFixed(2);
}

if (checkoutButton) {
  checkoutButton.addEventListener("click", async () => {
    if (cart.length === 0) {
      alert("Sepetiniz boş. Lütfen ürün ekleyin.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/create-order", {
        method: "POST", // POST metodu eklendi
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          products: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.ok) {
        alert("Ödeme başarılı! Sipariş oluşturuldu.");
        cart.length = 0;
        updateCartUI();
      } else {
        alert("Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  });
}

// Çarpı butonunu hedefleyen event listener
const closeCartModal = document.getElementById("close-cart-modal");

if (closeCartModal) {
  closeCartModal.addEventListener("click", () => {
    const cartModal = document.getElementById("cart-modal");
    if (cartModal) {
      cartModal.classList.add("hidden"); // Sepet modalını kapatır
    }
  });
}



  /* -------------------- Membership Modals -------------------- */
  const signinModal = document.getElementById("signin-modal");
  const signupModal = document.getElementById("signup-modal");
  const closeSigninModal = document.getElementById("close-signin-modal");
  const closeSignupModal = document.getElementById("close-signup-modal");
  const membershipLink = document.getElementById("membership-link");

  if (membershipLink && signinModal && closeSigninModal && closeSignupModal) {
    membershipLink.addEventListener("click", () => signinModal.classList.remove("hidden"));
    closeSigninModal.addEventListener("click", () => signinModal.classList.add("hidden"));
    closeSignupModal.addEventListener("click", () => signupModal.classList.add("hidden"));

    document.getElementById("open-signup-modal").addEventListener("click", () => {
      signinModal.classList.add("hidden");
      signupModal.classList.remove("hidden");
    });
  }
  //Sign in 
  document.getElementById("signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value.trim();
  
    if (!email || !password) {
      alert("Email ve şifre boş bırakılamaz.");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token); // Token'ı sakla
        localStorage.setItem("userName", `${data.firstName} ${data.lastName}`); // Adı ve soyadı sakla
  
        alert("Giriş başarılı!");
        document.getElementById("signin-modal").classList.add("hidden");
        updateMembershipName();
      } else {
        const error = await response.json();
        alert(error.message || "Giriş başarısız.");
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  });
  
  // Kullanıcı adını Membership alanında güncelleme
  function updateMembershipName() {
    const userName = localStorage.getItem("userName");
    const membershipText = document.getElementById("membership-text");
  
    if (userName && membershipText) {
      membershipText.textContent = `Welcome, ${userName}`;
    }
  }
  
  
  // Sayfa yüklendiğinde Membership adını güncelle
  document.addEventListener("DOMContentLoaded", updateMembershipName);
  
  //Sign Up
  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const firstName = document.getElementById("signup-firstname").value.trim();
    const lastName = document.getElementById("signup-lastname").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
  
    if (!firstName || !lastName || !email || !password) {
      alert("Tüm alanları doldurun.");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
  
      if (response.ok) {
        alert("Kayıt başarılı!");
        document.getElementById("signup-modal").classList.add("hidden"); // Modalı kapat
        document.getElementById("signin-modal").classList.remove("hidden"); // Giriş modalını aç
      } else {
        const error = await response.json();
        alert(error.message || "Kayıt başarısız.");
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  });
  
  
  /* -------------------- Fetch Categories and Products -------------------- */
  async function fetchCategories() {
    try {
      const response = await fetch("http://localhost:3000/categories");
      const categories = await response.json();
      displayCategories(categories);
    } catch (error) {
      console.error("Kategoriler alınırken hata oluştu:", error);
    }
  }

  function displayCategories(categories) {
    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = "";

    categories.forEach((category) => {
      const categoryButton = document.createElement("button");
      categoryButton.textContent = category.name;
      categoryButton.onclick = () => fetchProducts(category.id);
      categoryList.appendChild(categoryButton);
    });
  }

  async function fetchProducts(categoryId) {
    try {
      const response = await fetch(`http://localhost:3000/products/${categoryId}`);
      const products = await response.json();
      displayProducts(products);
    } catch (error) {
      console.error("Ürünler alınırken hata oluştu:", error);
    }
  }

  function displayProducts(products) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";

    products.forEach((product) => {
      const productDiv = document.createElement("div");
      productDiv.classList.add("product");
      productDiv.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <span>$${product.price}</span>
        <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
      `;
      productList.appendChild(productDiv);
    });
  }

  // Sayfa yüklendiğinde varsayılan kategori ürünlerini getir
document.addEventListener("DOMContentLoaded", () => {
  const defaultCategoryId = 1;
  fetchProducts(defaultCategoryId);
});

  // Sayfa yüklendiğinde kategorileri al
  window.onload = fetchCategories;
});

