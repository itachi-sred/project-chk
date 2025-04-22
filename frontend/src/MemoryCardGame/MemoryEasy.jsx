import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Button, Typography } from "@mui/material";
import ReactModal from "react-modal";
import { styled } from "@mui/system";
import PropTypes from "prop-types";
import { useSpring, animated } from "@react-spring/web";
import { ethers } from "ethers";
import background from "../assets/images/mode1.gif";
import bgMusic from "../assets/audio/memory-bg.mp3";
import axios from "axios";

// Setup react-modal for accessibility
ReactModal.setAppElement('#root');

// Constants
const defaultDifficulty = "Easy";
const cardImages = [
  { id: 1, image: "/images/meteor.png" },
  { id: 2, image: "/images/meteor.png" },
  { id: 3, image: "/images/comet.png" },
  { id: 4, image: "/images/comet.png" },
];
const matchAudioFiles = ["/audio/wonderful.mp3"];
const congratsAudio = "/audio/congrats.mp3";

// Utility: shuffle
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Save game data
const saveGameData = async (data) => {
  try {
    await axios.post("http://localhost:5323/api/memory/save", data, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error saving game data:", err);
  }
};

// Styled components
const StyledGameContainer = styled(Box)(({ mouseDisabled }) => ({
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  backgroundImage: `url(${background})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
  pointerEvents: mouseDisabled ? "none" : "auto"
}));
const PixelButton = styled(Button)(() => ({
  backgroundColor: "#2c2c54",
  color: "#fff",
  fontFamily: '"Press Start 2P", cursive',
  fontSize: "14px",
  padding: "15px 30px",
  border: "2px solid #00d9ff",
  borderRadius: "8px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  textTransform: "none",
  '&:hover': { backgroundColor: "#40407a" },
  '&:active': { transform: "scale(0.95)" }
}));
const PixelTypography = styled(Typography)(() => ({
  fontFamily: '"Press Start 2P", cursive',
  fontSize: "14px",
  color: "#fff",
  wordBreak: "break-all"
}));
const WalletInfoContainer = styled(Box)(() => ({
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "10px 20px",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  border: "2px solid #00d9ff",
  borderRadius: "10px",
  zIndex: 1000,
}));

const WalletAddressText = styled(PixelTypography)(() => ({
  fontSize: "12px",
  color: "#00d9ff",
  textAlign: "center",
}));
// Card components
const CardContainer = styled(Box)(() => ({ perspective: "1000px", cursor: "pointer", width: "220px", height: "220px" }));
const CardInner = styled(animated.div)(() => ({ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }));
const CardFront = styled(Box)(() => ({
  position: "absolute", top:0, left:0, width:"80%", height:"80%",
  backfaceVisibility:"hidden", display:"flex", justifyContent:"center", alignItems:"center",
  borderRadius:"8px", transform:"rotateY(180deg)", boxShadow:"0 4px 8px rgba(0,0,0,0.5)"
}));
const CardBack  = styled(Box)(() => ({
  position: "absolute", top:0, left:0, width:"90%", height:"90%",
  backfaceVisibility:"hidden", display:"flex", justifyContent:"center", alignItems:"center",
  borderRadius:"8px", transform:"rotateY(0deg)", boxShadow:"0 4px 8px rgba(0,0,0,0.5)"
}));
const Card = ({ card, handleClick, flipped, matched }) => {
  const { transform } = useSpring({
    transform: flipped || matched ? "rotateY(180deg)" : "rotateY(0deg)",
    config: { tension: 500, friction: 30 }
  });
  return (
    <CardContainer onClick={handleClick}>
      <CardInner style={{ transform }}>
        <CardFront><img src={card.image} style={{ width: "140%", height: "140%" }} /></CardFront>
        <CardBack><img src="/images/Back2.png" style={{ width: "120%", height: "120%" }} /></CardBack>
      </CardInner>
    </CardContainer>
  );
};
Card.propTypes = { card: PropTypes.object.isRequired, handleClick: PropTypes.func.isRequired, flipped: PropTypes.bool.isRequired, matched: PropTypes.bool.isRequired };

// Main component
const MemoryEasy = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState(null);
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [initialReveal, setInitialReveal] = useState(true);
  const [mouseDisabled, setMouseDisabled] = useState(false);
  const [audioIndex, setAudioIndex] = useState(0);
  const audioRef = useRef(null);

  const userID = localStorage.getItem("userID");
  if (!userID) return null;

  // Wallet handlers
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(acct);
    } catch {};
  };
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts) => accounts[0] && setWalletAddress(accounts[0]));
    }
  }, []);

  // Start game when wallet connected
  useEffect(() => {
    if (walletAddress) {
      newGame();
    }
  }, [walletAddress]);

  // Initialize audio and timer
  useEffect(() => {
    const initAudio = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
        audioRef.current = null;
      }
    };
    document.addEventListener("click", initAudio);
    return () => document.removeEventListener("click", initAudio);
  }, []);

  useEffect(() => {
    let id;
    if (timerActive) {
      id = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(id);
  }, [timerActive]);

  // Handle matches
  useEffect(() => {
    if (flippedCards.length === 2) {
      const [f, s] = flippedCards;
      setTimeout(() => {
        if (cards[f].image === cards[s].image) {
          setMatchedCards((m) => [...m, cards[f].id, cards[s].id]); // Add both card IDs here
          if (audioIndex < matchAudioFiles.length) {
            new Audio(matchAudioFiles[audioIndex]).play();
            setAudioIndex((i) => i + 1);
          }
        } else {
          setFailedAttempts((f) => f + 1);
        }
        setFlippedCards([]);
      }, 1000);
    }
  }, [flippedCards]);

  // Completion
  useEffect(() => {
    if (matchedCards.length === cards.length && cards.length) {
      new Audio(congratsAudio).play();
      setTimerActive(false);
      saveGameData({ userID, gameDate: new Date(), failed: failedAttempts, difficulty: defaultDifficulty, completed: 1, timeTaken: timer });
      setTimeout(() => navigate("/congt-easy"), 1000);
    }
  }, [matchedCards]);

  const handleFlip = (i) => {
    if (
      mouseDisabled ||
      flippedCards.includes(i) ||
      matchedCards.includes(cards[i].id) ||
      flippedCards.length === 2
    ) return;
    setFlippedCards((f) => [...f, i]);
  };

  // New game logic
  const newGame = () => {
    setCards(shuffleArray(cardImages));
    setFlippedCards([]);
    setMatchedCards([]);
    setFailedAttempts(0);
    setTimer(0);
    setTimerActive(true);
    setInitialReveal(true);
    setAudioIndex(0);
    setMouseDisabled(true);
    setTimeout(() => setMouseDisabled(false), 2000);
    setTimeout(() => setInitialReveal(false), 1500);
  };

  return (
    <StyledGameContainer mouseDisabled={mouseDisabled}>
      <audio ref={audioRef} src={bgMusic} loop />

      {!walletAddress ? (
        <PixelButton onClick={connectWallet} sx={{ mb: 4 }}>
          Connect Wallet
        </PixelButton>
      ) : (
        <WalletInfoContainer>
        <WalletAddressText>Wallet: {walletAddress}</WalletAddressText>
      </WalletInfoContainer>
      )}

      {walletAddress && (
        <Grid container spacing={6} justifyContent="center">
          {cards.map((c, i) => (
            <Grid item xs={6} key={i}>
              <Card card={c} handleClick={() => handleFlip(i)} flipped={initialReveal || flippedCards.includes(i)} matched={matchedCards.includes(c.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </StyledGameContainer>
  );
};

export default MemoryEasy;
