CREATE TABLE hero_banners (
    id SERIAL PRIMARY KEY,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    mobile_image_url TEXT,
    link TEXT,
    bg_gradient TEXT
);

CREATE TABLE health_reviews (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    tag TEXT,
    link TEXT,
    quiz_id TEXT
);

CREATE TABLE community_videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    bg_image_url TEXT,
    product_img_url TEXT,
    overlay_text TEXT,
    youtube_id TEXT
);

CREATE TABLE customer_reviews (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    author TEXT,
    product_icon_url TEXT,
    bg_image_url TEXT,
    stars INTEGER
);
