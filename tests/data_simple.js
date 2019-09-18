data =
	{
		symb_stats: {
			"a": { pocc: 100, tocc: 3 },
			"b": { pocc: 50, tocc: 3 },
			"c": { pocc: 50, tocc: 3 },
			"d": { pocc: 25, tocc: 3 },
			"e": { pocc: 50, tocc: 3 },
			"f": { pocc: 10, tocc: 3 }
		},
		ngrams: [
			{ shift: 1, ngram: ["b", "a", "b"], pocc: 4, tocc: 2 },
			{ shift: 2, ngram: ["b", "e", "a"], pocc: 4, tocc: 2 },
			{ shift: 1, ngram: ["e", "a"], pocc: 4, tocc: 2 },
			{ shift: 1, ngram: ["e", "a", "a"], pocc: 4, tocc: 2 },
			{ shift: 1, ngram: ["a", "a", "e"], pocc: 4, tocc: 2 },
			{ shift: 1, ngram: ["a", "f", "a"], pocc: 4, tocc: 2 },
			{ shift: 0, ngram: ["a", "a", "a"], pocc: 4, tocc: 2 },
			{ shift: 0, ngram: ["a"], pocc: 4, tocc: 2 },
			{ shift: 0, ngram: ["a", "b"], pocc: 4, tocc: 2 },
			{ shift: 0, ngram: ["a", "a"], pocc: 4, tocc: 2 },
			{ shift: 2, ngram: ["e", "b", "a"], pocc: 4, tocc: 2 },
			{ shift: 1, ngram: ["c", "a"], pocc: 4, tocc: 2 },
			{ shift: 2, ngram: ["c", "c", "a"], pocc: 4, tocc: 2 },
			{ shift: 0, ngram: ["a", "c", "c"], pocc: 4, tocc: 2 }
		]
	}