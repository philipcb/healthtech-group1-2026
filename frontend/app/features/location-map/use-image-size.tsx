import { useEffect, useState } from "react";

export type ImageSize = {
	height: number;
	width: number;
};

/** `null` until the image has loaded, and without an image */
export function useImageSize(imageUrl: string | undefined) {
	const [imageSize, setImageSize] = useState<ImageSize | null>(null);

	useEffect(() => {
		if (!imageUrl) {
			setImageSize(null);
			return;
		}

		const image = new Image();

		image.onload = () => {
			setImageSize({
				width: image.naturalWidth,
				height: image.naturalHeight,
			});
		};

		image.src = imageUrl;
	}, [imageUrl]);

	return imageSize;
}
