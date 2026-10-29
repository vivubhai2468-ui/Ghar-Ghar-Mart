import { Animated, Easing } from 'react-native';

/**
 * Fade in animation for cards and elements
 * @param duration Animation duration in milliseconds
 */
export function createFadeInAnimation(duration: number = 300) {
  const fadeAnim = new Animated.Value(0);

  const startAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return { fadeAnim, startAnimation };
}

/**
 * Scale animation for lift effect on tap
 * @param initialScale Starting scale value
 * @param targetScale Target scale value
 * @param duration Animation duration in milliseconds
 */
export function createScaleAnimation(
  initialScale: number = 1,
  targetScale: number = 0.98,
  duration: number = 150
) {
  const scaleAnim = new Animated.Value(initialScale);

  const scaleDown = () => {
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const scaleUp = () => {
    Animated.timing(scaleAnim, {
      toValue: initialScale,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return { scaleAnim, scaleDown, scaleUp };
}

/**
 * Slide animation for page transitions
 * @param initialValue Starting position
 * @param duration Animation duration in milliseconds
 */
export function createSlideAnimation(
  initialValue: number = 100,
  duration: number = 300
) {
  const slideAnim = new Animated.Value(initialValue);

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return { slideAnim, slideIn };
}

/**
 * Pulse animation for badges and highlights
 * @param duration Animation duration in milliseconds
 */
export function createPulseAnimation(duration: number = 1000) {
  const pulseAnim = new Animated.Value(1);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: duration / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return { pulseAnim, startPulse };
}

/**
 * Bounce animation for success feedback
 * @param duration Animation duration in milliseconds
 */
export function createBounceAnimation(duration: number = 600) {
  const bounceAnim = new Animated.Value(0);

  const bounce = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -20,
        duration: duration / 3,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: -5,
        duration: duration / 3,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: duration / 3,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { bounceAnim, bounce };
}

/**
 * Rotation animation for loading spinner
 * @param duration Animation duration in milliseconds
 */
export function createRotationAnimation(duration: number = 1000) {
  const rotateAnim = new Animated.Value(0);

  const startRotation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return { rotateAnim, rotation, startRotation };
}

/**
 * Stagger animation for list items
 * @param itemCount Number of items to animate
 * @param delayPerItem Delay between each item animation in milliseconds
 * @param duration Animation duration in milliseconds
 */
export function createStaggerAnimation(
  itemCount: number,
  delayPerItem: number = 50,
  duration: number = 300
) {
  const animations = Array.from({ length: itemCount }, () =>
    new Animated.Value(0)
  );

  const startStagger = () => {
    animations.forEach((anim, index) => {
      setTimeout(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, index * delayPerItem);
    });
  };

  return { animations, startStagger };
}
