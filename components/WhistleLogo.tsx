import React from 'react';
import { Image, ImageProps } from 'react-native';

interface WhistleLogoProps extends Omit<ImageProps, 'source'> {
  size?: number;
}

export const WhistleLogo: React.FC<WhistleLogoProps> = ({ 
  size = 100, 
  style,
  ...props 
}) => {
  return (
    <Image
      source={require('../assets/images/whistle-logo.jpeg')}
      resizeMode="contain"
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default WhistleLogo;