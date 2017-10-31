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

	v = v.replace(/\bsimbu\b/g, "str");
	v = v.replace(/\bSimbu\b/g, "Str");
	v = v.replace(/\bSIMBU\b/g, "STR");
	v = v.replace(/\bSilambarasan\b/g, "STR");
	v = v.replace(/\bsilambarasan\b/g, "str");

	textNode.nodeValue = v;
}
