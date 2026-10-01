const NS='http://www.w3.org/2000/svg';
function el(name,attrs,text){const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
export class TerritoryMap{
  constructor(container,onSelect){this.container=container;this.onSelect=onSelect;this.zoom=1;this.points=[];}
  render(points,selected){this.points=points;this.selected=selected;this.draw();}
  scale(factor){this.zoom=Math.max(1,Math.min(3,this.zoom*factor));this.draw();}
  reset(){this.zoom=1;this.draw();}
  draw(){
    const svg=el('svg',{viewBox:'0 0 900 500',role:'group','aria-label':'Mapa de puntos. Usa Tab para seleccionarlos.'});
    const base=el('g',{transform:'translate(450 250) scale('+this.zoom+') translate(-450 -250)'});
    base.append(el('rect',{x:0,y:0,width:900,height:500,fill:'#ECEDE5'}));
    const blocks=[[40,20,170,95],[240,10,170,100],[445,10,175,100],[655,15,200,90],[30,145,180,115],[240,145,170,105],[445,145,170,110],[650,145,190,105],[45,290,165,90],[240,285,175,100],[455,290,160,100],[650,295,195,95],[35,415,180,90],[240,420,170,80],[450,425,180,80],[660,420,170,90]];
    for(const [x,y,w,h]of blocks){base.append(el('rect',{x,y,width:w,height:h,rx:9,fill:'#E0E3D9',stroke:'#D2D7CB','stroke-width':1}));base.append(el('path',{d:'M '+(x+18)+' '+y+' v '+h+' M '+x+' '+(y+30)+' h '+w,stroke:'#F4F3EC','stroke-width':7,fill:'none'}));}
    base.append(el('path',{d:'M -20 380 C 230 280, 350 415, 550 285 S 740 185, 950 225',stroke:'#BBD8D5','stroke-width':34,fill:'none'}));
    base.append(el('path',{d:'M -20 380 C 230 280, 350 415, 550 285 S 740 185, 950 225',stroke:'#D6E8E4','stroke-width':2,fill:'none'}));
    base.append(el('path',{d:'M 210 0 L 230 500 M 630 0 L 638 500 M 0 124 L 900 124 M 0 270 L 900 270 M 0 403 L 900 403',stroke:'#FCFBF5','stroke-width':17,fill:'none'}));
    for(const [x,y,t]of [[290,118,'AVENIDA CENTRAL'],[55,260,'SECTOR NORTE'],[688,394,'SECTOR SUR']])base.append(el('text',{x,y,fill:'#818B80','font-size':10,'letter-spacing':2},t));
    const lats=this.points.map(p=>p.latitude),lons=this.points.map(p=>p.longitude);
    const minLat=Math.min(-33.49,...lats),maxLat=Math.max(-33.42,...lats),minLon=Math.min(-70.71,...lons),maxLon=Math.max(-70.63,...lons);
    this.points.forEach((point,i)=>{
      const x=80+(point.longitude-minLon)/(maxLon-minLon)*740,y=420-(point.latitude-minLat)/(maxLat-minLat)*350;
      const g=el('g',{transform:'translate('+x+' '+y+')',tabindex:0,role:'button','aria-label':point.name,'aria-pressed':String(point.id===this.selected),class:'map-pin'});
      if(point.id===this.selected)g.append(el('circle',{r:28,fill:point.color,opacity:0.13}));
      g.append(el('circle',{r:16,fill:point.color,stroke:'#fff','stroke-width':3}));
      g.append(el('text',{'text-anchor':'middle',y:4,fill:'#fff','font-size':11,'font-weight':700},String(i+1).padStart(2,'0')));
      g.append(el('title',{},point.name));
      g.addEventListener('click',()=>this.onSelect(point.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onSelect(point.id);}});
      base.append(g);
    });svg.append(base);this.container.replaceChildren(svg);
  }
}
