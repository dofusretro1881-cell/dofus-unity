import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.tags.DefineSpriteTag;
import com.jpexs.decompiler.flash.tags.base.BoundedTag;
import com.jpexs.decompiler.flash.exporters.commonshape.Matrix;
import java.io.*;
import java.nio.file.*;
import javax.imageio.ImageIO;
public class ExportRetro {
 public static void main(String[] args) throws Exception {
  var swf=new SWF(new FileInputStream(args[0]),false);
  Path out=Path.of(args[1]);Files.createDirectories(out);
  for(String entry:args[2].split(",")){
   String[] parts=entry.split(":");String name=parts[0];int count=parts.length>1?Integer.parseInt(parts[1]):1;
   for(var e:swf.getCharacters(false).entrySet()){
    int id=e.getKey();var c=e.getValue();String n=swf.getExportName(id);
    if(name.equals(n)&&c instanceof DefineSpriteTag sprite){
     var rect=sprite.getRect();
     for(int time=0;time<count;time++){
      var image=SWF.frameToImageGet(sprite.getTimeline(),0,time,null,0,rect,new Matrix(),null,null,1.0,true,1);
      ImageIO.write(image.getBufferedImage(),"png",out.resolve(name+"-"+time+".png").toFile());
     }
     System.out.println(name+"\t"+id+"\t"+rect.Xmin/20.0+"\t"+rect.Ymin/20.0+"\t"+rect.Xmax/20.0+"\t"+rect.Ymax/20.0+"\t"+sprite.getTimeline().getFrameCount());
    }
   }
  }
 }
}
