# Gemini AI Integration for Battleship Game

## Overview

This document describes the integration of Google's Gemini AI as an intelligent opponent for the Battleship game, following the detailed phase-based approach for optimal 8x8 grid gameplay.

## Features

### Phase 1: Game Initialization (Pre-Game)

#### AI Ship Placement Strategy
- **Extreme Spreading**: Maximizes distance between ships to prevent chain reactions
- **Edge/Corner Focus**: Places ships along perimeter to avoid common center targeting
- **No Touching Rule**: Ensures ships don't touch horizontally, vertically, or diagonally
- **Buffer Zone Management**: Creates safe zones around each ship for optimal survivability

#### Ship Configuration for 8x8 Grid
- Carrier (5 units)
- Battleship (4 units)
- Cruiser (3 units)
- Submarine (3 units)
- Destroyer (2 units)

### Phase 2: During Gameplay (Turn-Based Intelligence)

#### Core Strategy: Dynamic Probability Mapping
- **Hunting Phase**: Uses systematic patterns (every 2nd square) for efficient board coverage
- **Targeting Phase**: Immediately focuses on sinking hit ships with directional analysis
- **Information Integration**: Updates probability maps based on hits, misses, and ability results

#### Ability Evaluation (Enhanced for 8x8)
- **SCANNER (Sonar Pulse)**: Higher value due to larger proportion coverage
- **NUKE**: Effective for eliminating ship clusters
- **ANNIHILATE**: Perfect for finishing damaged ships in sequence

#### Advanced Decision Making
- **Multi-factor Utility Function**: Weighs information gain, immediate damage, and strategic positioning
- **Adaptive Strategy**: Switches between hunting and targeting modes based on game state
- **Time Management**: Simulated thinking delay (1-5 seconds) for realistic gameplay

## Technical Implementation

### Core Files

#### `src/services/geminiAiService.js`
- **GeminiAiPlayer Class**: Main AI intelligence engine
- **Ship Placement Logic**: Optimal positioning algorithms
- **Decision Making**: Gemini API integration with fallback strategies
- **Probability Management**: Dynamic heatmap calculations

#### `src/services/aiGameService.js`
- **AiGameManager Class**: Handles game lifecycle
- **Room Management**: Creates and manages AI vs Player games
- **Monitoring System**: Tracks AI turns and responses
- **Statistics Collection**: Game performance analytics

### Integration Points

#### Home Page (`src/pages/Home.jsx`)
- Added "Play Against AI" option
- Difficulty selection (Easy, Medium, Hard)
- Seamless game creation flow

#### Ship Placement (`src/components/ShipPlacement_Mobile.jsx`)
- Auto-start support for AI games
- Handles both player and AI readiness states

#### Game Room (`src/pages/GameRoom.jsx`)
- AI monitoring initialization
- Game over cleanup for AI games
- Real-time AI turn management

## Configuration

### Environment Variables
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Dependencies
```json
{
  "@google/generative-ai": "^0.x.x"
}
```

## Usage

### Starting an AI Game

1. **From Home Page**:
   - Select "Play Against AI"
   - Enter your name
   - Choose AI difficulty
   - Click "Play Against AI"

2. **Game Flow**:
   - Place your ships normally
   - AI places ships automatically using optimal strategy
   - Game starts with human player going first
   - AI responds intelligently to your moves

### AI Behavior

#### Easy Mode
- Basic probability targeting
- Simple pattern hunting
- Conservative ability usage

#### Medium Mode
- Enhanced probability calculations
- Improved targeting after hits
- Strategic ability deployment

#### Hard Mode
- Advanced Gemini AI integration
- Sophisticated pattern recognition
- Optimal ability timing and placement

## API Integration

### Gemini Prompt Structure
```javascript
const prompt = `You are an expert AI playing Battleship on an 8x8 grid...
GAME STATE: ${JSON.stringify(gameState)}
STRATEGY FOR 8x8 GRID: [detailed strategy guidelines]
Respond with ONLY a valid JSON object: {...}`;
```

### Response Format
```json
{
  "action_type": "attack" | "ability",
  "coordinate": [row, col],
  "ability_name": "SCANNER" | "NUKE" | "ANNIHILATE",
  "target_area_center": [row, col],
  "reasoning": "Brief explanation of strategy"
}
```

## Error Handling

### Fallback Systems
- **Gemini API Failure**: Falls back to probability-based decisions
- **Invalid Responses**: Uses traditional AI algorithms
- **Network Issues**: Implements timeout and retry mechanisms

### Monitoring
- Real-time AI performance tracking
- Move validation and error correction
- Game state consistency checks

## Performance Optimization

### AI Response Time
- **Thinking Simulation**: 1-5 second delays for realistic experience
- **Async Processing**: Non-blocking decision making
- **Memory Management**: Efficient probability map updates

### Firebase Integration
- **Real-time Updates**: Seamless multiplayer state synchronization
- **Turn Management**: Automated AI move processing
- **Game History**: Complete move tracking and analytics

## Future Enhancements

### Potential Improvements
1. **Adaptive Difficulty**: AI learns from player patterns
2. **Custom Strategies**: Player-selectable AI personalities
3. **Advanced Abilities**: AI-specific special abilities
4. **Tournament Mode**: Progressive difficulty challenges
5. **Machine Learning**: Pattern recognition improvements

### Analytics Integration
- Player vs AI win rates
- Common AI strategies effectiveness
- Difficulty calibration data
- Move time analysis

## Troubleshooting

### Common Issues
1. **API Key Issues**: Verify VITE_GEMINI_API_KEY is set correctly
2. **Network Problems**: Check internet connectivity for Gemini API
3. **Game State Errors**: Ensure Firebase real-time database is accessible
4. **Performance Issues**: Monitor AI response times and adjust delays

### Debug Mode
Enable detailed logging by setting:
```javascript
console.log('AI Debug Mode:', {
  gameState,
  decision,
  probabilityMap,
  moveHistory
});
```

## Security Considerations

### API Key Protection
- Environment variables for API keys
- Server-side validation (if implemented)
- Rate limiting for API calls

### Game Integrity
- Move validation on both client and server
- Anti-cheat measures for AI interactions
- Secure state management

---

This integration provides a challenging, intelligent AI opponent that adapts to the unique characteristics of the 8x8 Battleship grid while maintaining fair and engaging gameplay for human players.
