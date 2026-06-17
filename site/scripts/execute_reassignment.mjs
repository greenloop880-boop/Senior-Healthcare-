import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_URL = 'https://pub-491acc29113c488184f9213225b80bba.r2.dev';

const imageList = [
  "products/1781156806399-4mfbg.jpg",
  "products/1781156808346-2ptstk.jpg",
  "products/1781156810380-8c3r7m.jpg",
  "products/1781156811363-h8me2j.jpg",
  "products/1781156812360-r84lqr.jpg",
  "products/1781156814234-tmzuf4.jpg",
  "products/1781156815187-z903qp.jpg",
  "products/1781156816157-nr7w2o.jpg",
  "products/1781156817099-lo3l7q.jpg",
  "products/1781156822966-5nggsk.jpg",
  "products/1781156824073-76g8j9.jpg",
  "products/1781156826309-nu4pne.jpg",
  "products/1781156827269-g6eifc.jpg",
  "products/1781201461473-hp0pc.avif",
  "products/1781207018043-974y6d.avif",
  "products/1781207018784-hhl46.avif",
  "products/1781386280120-hyjo8.avif",
  "products/1781386358358-oehah3.avif",
  "products/1781386509229-sephah.avif",
  "products/1781386510100-ubnyrg.avif",
  "products/1781386698037-mjsxcg.avif",
  "products/1781386775413-4kjsea.avif",
  "products/1781386839618-hdjm5.avif",
  "products/1781386972152-v1d2m5.avif",
  "products/1781387088657-6z7rv.avif",
  "products/1781387171517-htu285.avif",
  "products/1781387195760-anh64a.avif",
  "products/1781387681713-b25ph.avif",
  "products/1781387682428-bsqe7h.avif",
  "products/1781387683074-8farl.avif",
  "products/1781387683658-goyvb.avif",
  "products/1781387684346-g53jg8.avif",
  "products/1781387685089-dzq9uf.avif",
  "products/1781387685807-rmqgf.avif",
  "products/1781387686491-zevnqh.avif",
  "products/1781388471018-qxyyg.avif",
  "products/1781388472027-dz0hvj.avif",
  "products/1781388472539-huywjw.avif",
  "products/1781388473358-97k4n.avif",
  "products/1781388474179-07musf.avif",
  "products/1781388474897-lvn586.avif",
  "products/1781388475510-al9ltt.avif",
  "products/1781388476124-7mweu.avif",
  "products/1781388719644-xbqic.avif",
  "products/1781388720401-x2k17w.avif",
  "products/1781388720966-dhyw2v.avif",
  "products/1781388721573-mowi9x.avif",
  "products/1781389047721-ms0o8.avif",
  "products/1781389048340-otvmd5.avif",
  "products/1781389048952-q3krwp.avif",
  "products/1781389049490-hgzn24.avif",
  "products/1781389050251-ht99ib.avif",
  "products/1781468107993-n58hcq.avif",
  "products/1781468108797-0ef8es.avif",
  "products/1781517489089-frkpae.png",
  "products/1781517491339-hwv2lk.png",
  "products/1781517492534-ifawqu.png"
];

const proposedMappings = {
  "ankle-brace": { mainImg: 20, gallery: [21, 23, 24, 26, 27, 29, 30] },
  "arm-bp": { mainImg: 45, gallery: [47, 49, 52] },
  "grab-bar": { mainImg: 3, gallery: [32, 33, 35, 36] },
  "lumbar-support": { mainImg: 38, gallery: [39, 41, 42, 44] },
  "nebulizer-machine": { mainImg: 8, gallery: [9, 11, 12, 14, 15, 17, 18] },
  "neck-pillow": { mainImg: 6, gallery: [57] },
  "one-touch-bp": { mainImg: 53, gallery: [54] },
  "pill-organizer": { mainImg: 55, gallery: [] },
  "shower-chair": { mainImg: 2, gallery: [5, 56] },
  "wrist-bp": { mainImg: 50, gallery: [51] }
};

async function run() {
  const { data: products, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if(error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  const completionReport = [];

  for(let p of products) {
    const prevMain = p.image_url;
    let status = '';
    let newMain = null;
    let newGalleryUrls = [];
    
    // Check if it's in the approved list
    if (proposedMappings[p.id]) {
      const mapping = proposedMappings[p.id];
      newMain = `${PUBLIC_URL}/${imageList[mapping.mainImg - 1]}`;
      newGalleryUrls = mapping.gallery.map(idx => `${PUBLIC_URL}/${imageList[idx - 1]}`);
      
      // Update gallery to have exactly 4 items for admin panel
      const paddedGalleryUrls = [...newGalleryUrls];
      while(paddedGalleryUrls.length < 4) paddedGalleryUrls.push('');
      if(paddedGalleryUrls.length > 4) paddedGalleryUrls.length = 4; // truncate to 4 just in case
      
      let newSpecs = p.specs || [];
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      if(newGalleryUrls.length > 0) {
        newSpecs.push(`__GALLERY__:${JSON.stringify(paddedGalleryUrls)}`);
      }
      
      await supabase.from('products').update({
        image_url: newMain,
        specs: newSpecs
      }).eq('id', p.id);
      
      status = 'Updated';
    } else {
      // It's a missing image product. Clear its placeholders.
      let newSpecs = p.specs || [];
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      
      await supabase.from('products').update({
        image_url: null,
        specs: newSpecs
      }).eq('id', p.id);
      
      status = 'Missing Images';
    }
    
    completionReport.push({
      title: p.title,
      handle: p.id,
      prevMain: prevMain,
      newMain: newMain,
      gallery: newGalleryUrls,
      status: status
    });
    
    console.log(`Processed ${p.id} -> ${status}`);
  }
  
  fs.writeFileSync('completion_report.json', JSON.stringify(completionReport, null, 2));
  console.log("Reassignment completed. Wrote completion_report.json");
}

run();
