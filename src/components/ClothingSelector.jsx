import React from 'react';
import './ClothingSelector.css'; // We'll create this CSS file next

// This component receives the list of items and the 'onSelect' function as props from App.jsx.
const ClothingSelector = ({ items, onSelect }) => {
  return (
    <div className="selector-container">
      <h3>Choose an Item to Try On</h3>
      <div className="item-gallery">
        {/* We map over the 'items' array that was passed down as a prop. */}
        {items.map((item) => (
          <div 
            key={item.id} 
            className="gallery-card" 
            // When a card is clicked, we call the onSelect function that was passed
            // down from App.jsx, sending the whole 'item' object back up.
            onClick={() => onSelect(item)}
          >
            <img src={item.image} alt={item.title} className="gallery-image" />
            <p className="gallery-title">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClothingSelector;