<?php
$baseurl = 'https://www.blocket.se/stockholm?q=&cg=1120&w=1&st=s&ps=&pe=&c=&ca=11&is=1&l=0&md=th&o=1';
$current_page = 0;
$last_page = 0;

function parseUrl($url) {
  $GET = explode("&",substr($url, strpos($url, "?")+1));
  $result = array();
  for($i = 0; $i < count($GET); $i++) {
    $row = $GET[$i];
    $key = substr($row, 0, strpos($row, "="));
    $value = substr($row, strpos($row, "=")+1);
    $result[$key] = $value;
  }

  return $result;
}

$getvars = parseUrl($baseurl);
if(array_key_exists('o', $getvars)) {
  $current_page = $getvars['o'];
}
echo "Current Page: ".$current_page;
/*if($key == "o") {
  echo "Page: ".$value;
  $current_page = $value;
}*/

//echo json_encode($GET);
$url = $baseurl;


$blocket = file_get_contents($url);
$DOM = new DOMDocument;
$DOM->loadHTML($blocket);

$all_pages = $DOM->getElementById('all_pages')->childNodes;
for($i = 0; $i < $all_pages->length; $i++)
{
  $child = $all_pages->item($i);
  //echo $child->tagName;
  for($j = 0; $j < $child->childNodes->length; $j++) {
    $subchild = $child->childNodes->item($j);
    if($subchild->tagName == "a") {
      if($subchild->getAttribute("rel") == "Sista sidan") {
        $result = parseUrl($subchild->getAttribute("href"));
        if(array_key_exists("o", $result)) {
          $last_page = $result['o'];
        }
        echo "Last Page: ".$last_page;

      }
    }
  }
  /*if($child->childNodes->item(0)->getAttribute("rel") == "Sista sidan") {
    echo $child->childNodes->item(0)->getAttribute("href");
  }*/
}

exit;
$items = $DOM->getElementById('item_list')->childNodes;

for($i = 0; $i < $items->length; $i++)
{
  $child = $items->item($i);
  if($child->tagName == "article")
  {
    echo $child->childNodes->item(0)->getAttribute("href");
    //echo dominnerHTML($child);
    //echo dominnerHTML($child->childNodes->item(0));
    //echo $link->getAttribute("href");
  }
  echo "\n\n";
}










function DOMinnerHTML($element)
{
    $innerHTML = "";
    $children = $element->childNodes;
    foreach ($children as $child)
    {
        $tmp_dom = new DOMDocument();
        $tmp_dom->appendChild($tmp_dom->importNode($child, true));
        $innerHTML.=trim($tmp_dom->saveHTML());
    }
    return $innerHTML;
}
?>
