// src/MemoryCardGame/Card.jsx
import React from "react";
import { Card as MUICard, CardActionArea, CardMedia } from "@mui/material";

const Card = ({ card, onClick, isFlipped, isMatched }) => {
  return (
    <MUICard
      sx={{
        width: 100,
        height: 140,
        backgroundColor: isMatched ? "lightgreen" : "white",
        border: isMatched ? "2px solid green" : "1px solid gray",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        transition: "transform 0.5s",
        perspective: "1000px",
      }}
      onClick={onClick}
    >
      <CardActionArea>
        <CardMedia
          component="img"
          height="140"
          image={isFlipped || isMatched ? card.image : "/card-back.png"}
          alt="card"
        />
      </CardActionArea>
    </MUICard>
  );
};

export default Card;
