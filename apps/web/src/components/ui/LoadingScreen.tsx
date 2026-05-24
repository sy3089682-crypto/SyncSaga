'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const QUOTES = [
  { quote: "It's not the face that makes someone a monster; it's the choices they make with their lives.", anime: "Naruto" },
  { quote: "The world isn't perfect. But it's there for us, doing the best it can.", anime: "Fullmetal Alchemist" },
  { quote: "You may have to fight a battle more than once to win it.", anime: "Code Geass" },
  { quote: "If you don't like your destiny, don't accept it. Instead, have the courage to change it.", anime: "Naruto" },
  { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", anime: "Fullmetal Alchemist" },
  { quote: "A lesson without pain is meaningless.", anime: "Fullmetal Alchemist" },
  { quote: "The difference between the novice and the master is that the master has failed more times than the novice has tried.", anime: "Koro-sensei" },
  { quote: "It's not the load that breaks you down, it's the way you carry it.", anime: "Code Geass" },
  { quote: "People who can't throw something important away can never change.", anime: "Attack on Titan" },
  { quote: "If you can't find a reason to fight, then you shouldn't be fighting.", anime: "Attack on Titan" },
  { quote: "The only ones who should kill are those who are prepared to be killed.", anime: "Death Note" },
  { quote: "I'll take a potato chip... and eat it!", anime: "Death Note" },
  { quote: "Believe in the me that believes in you!", anime: "Gurren Lagann" },
  { quote: "Don't forget. Always, somewhere, someone is fighting for you.", anime: "Puella Magi Madoka Magica" },
  { quote: "There's no shame in falling down. True shame is not standing up again.", anime: "One Piece" },
  { quote: "Being alone is better than being with someone who doesn't make you happy.", anime: "Your Lie in April" },
  { quote: "The moment you think of giving up, think of the reason why you held on so long.", anime: "Naruto" },
  { quote: "Power comes in response to a need, not a desire.", anime: "Dragon Ball" },
  { quote: "You must not underestimate the power of a fool who has nothing to lose.", anime: "Hunter x Hunter" },
  { quote: "A person's life is like a flower. Some bloom beautifully, others wither before they can bloom.", anime: "Bleach" },
  { quote: "If you have time to think of a beautiful finish, then live beautifully to the very end.", anime: "Gintama" },
  { quote: "The ticket to the future is always open.", anime: "Steins;Gate" },
  { quote: "Just because someone is wrong doesn't mean they're evil.", anime: "Re:Zero" },
  { quote: "In this world, wherever there is light, there are also shadows.", anime: "Death Note" },
  { quote: "I don't want to be a tool. I want to be a person.", anime: "Violet Evergarden" },
  { quote: "Sometimes the most painful goodbyes are the ones left unsaid.", anime: "Clannad" },
  { quote: "Reject common sense to make the impossible possible!", anime: "Gurren Lagann" },
  { quote: "The world is cruel, but also beautiful.", anime: "Attack on Titan" },
  { quote: "Never forget that you can smile even when you're sad.", anime: "One Piece" },
  { quote: "I see now that the circumstances of one's birth are irrelevant. It's what you do with the gift of life that determines who you are.", anime: "Pokemon" },
  { quote: "Even if we forget the faces of our friends, we will never forget the bonds that were carved into our souls.", anime: "Fairy Tail" },
  { quote: "A wound that the world inflicts on the weak is not something that can be healed by becoming strong.", anime: "Attack on Titan" },
  { quote: "We're not friends because we're perfect. We're friends because we accept each other's flaws.", anime: "K-On!" },
  { quote: "Sometimes you have to accept that some people are part of your history, but not your destiny.", anime: "Naruto" },
  { quote: "If you only face forward, you won't be able to see what's coming from the side.", anime: "Attack on Titan" },
  { quote: "The world isn't fair. But remember that it's also not just.", anime: "Fate/Zero" },
  { quote: "In the end, what matters is not the length of the journey, but the depth of the experience.", anime: "Mushishi" },
  { quote: "There are no regrets. If you live your life without regrets, it becomes something wonderful.", anime: "Sword Art Online" },
  { quote: "The kind of person who sits around waiting for someone else to do something will never accomplish anything.", anime: "Haikyuu!!" },
  { quote: "Talent is something you bloom. Instinct is something you polish.", anime: "Haikyuu!!" },
  { quote: "The ones who stand at the top determine what's wrong and what's right.", anime: "Attack on Titan" },
  { quote: "To know sorrow is not terrifying. What is terrifying is to know you can't go back to the happiness you once had.", anime: "Fruits Basket" },
  { quote: "It's only after you've stepped outside your comfort zone that you begin to change, grow, and transform.", anime: "One Piece" },
  { quote: "If you can't hold onto who you are, you can't hold onto anyone else.", anime: "Bleach" },
  { quote: "Fear is not evil. It tells you what your weakness is.", anime: "One Piece" },
  { quote: "Even if we lose, even if we die, the soul of the defeated still lives on.", anime: "Gurren Lagann" },
  { quote: "There is meaning in growing flowers even if you know they'll wither.", anime: "Vinland Saga" },
  { quote: "Nobody knows what the future holds. That's why its potential is infinite.", anime: "Steins;Gate" },
  { quote: "We don't know what we're capable of until we're put to the test.", anime: "One Punch Man" },
  { quote: "The only person who can beat me is me.", anime: "One Punch Man" },
];

export function LoadingScreen({ message }: { message?: string }) {
  const [quote, setQuote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-primary"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <div className="w-48 h-1 bg-surface-light rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-accent-pink to-accent-cyan rounded-full"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {message && (
        <p className="text-text-secondary text-sm mb-6">{message}</p>
      )}

      <motion.div
        key={quote.quote}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center px-4"
      >
        <p className="text-text-muted text-sm italic leading-relaxed mb-2">&ldquo;{quote.quote}&rdquo;</p>
        <p className="text-text-muted text-xs">— {quote.anime}</p>
      </motion.div>
    </div>
  );
}
