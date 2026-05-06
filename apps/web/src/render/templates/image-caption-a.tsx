import type { TemplateDef } from "./types";

export const imageCaptionA: TemplateDef = {
  key: "image_caption_a",
  name: "Image with caption — full bleed",
  type: "image_caption",
  active: true,
  render: ({ brand, props }) => {
    const imageUrl = props.imageUrl ?? "";
    const caption = props.caption ?? props.copy ?? "";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: brand.palette.background,
          fontFamily: `"${brand.font}", sans-serif`,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={1080}
            height={1080}
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: brand.palette.text,
              opacity: 0.5,
            }}
          >
            (image goes here)
          </div>
        )}

        {caption ? (
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "60px 80px",
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
              color: "#FFFFFF",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {caption}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 32,
            right: 32,
            padding: "8px 16px",
            background: brand.palette.accent,
            color: brand.palette.background,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.12em",
            borderRadius: 6,
          }}
        >
          {brand.name}
        </div>
      </div>
    );
  },
};
