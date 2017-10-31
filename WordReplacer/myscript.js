walk(document.body);

function walk(node) {
	var child, next;

	switch (node.nodeType) {
		case 1:
		case 9:
		case 11:
			child = node.firstChild;

			while (child) {
				next = child.nextSibling;
				walk(child)
				child = next
			}
			break;

		case 3:
			handleText(node);
			break;
	}
}

function handleText(textNode)
{
	var v = textNode.nodeValue;

	v = v.replace(/\bsimbu\b/g, "sombu");
	v = v.replace(/\bSimbu\b/g, "Sombu");
	v = v.replace(/\bSIMBU\b/g, "SOMBU");
	v = v.replace(/\bSilambarasan\b/g, "Sombu");
	v = v.replace(/\bsilambarasan\b/g, "sombu");

	textNode.nodeValue = v;
}
