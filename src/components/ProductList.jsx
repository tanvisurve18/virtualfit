import React, { useState, useEffect } from 'react';
import './ProductList.css'; // We'll create this for styling

// The 'onProductSelect' prop is a function passed down from App.jsx
const ProductList = ({ onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch products from the Fake Store API
        const response = await fetch("https://fakestoreapi.com/products/category/women's clothing");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="product-container">
      <h3>Choose an Item to Try On</h3>
      <div className="product-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.title} className="product-image" />
            <p className="product-title">{product.title}</p>
            <button onClick={() => onProductSelect(product.image)}>
              Try On
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;