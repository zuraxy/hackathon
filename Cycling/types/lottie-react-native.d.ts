declare module 'lottie-react-native' {
  import { ComponentClass } from 'react';
    import { ViewProps } from 'react-native';

  type LottieProps = ViewProps & {
    source?: any;
    autoPlay?: boolean;
    loop?: boolean;
    progress?: number;
    speed?: number;
    onAnimationFinish?: () => void;
  };

  const LottieView: ComponentClass<LottieProps> & { play?: () => void; reset?: () => void };
  export default LottieView;
}
