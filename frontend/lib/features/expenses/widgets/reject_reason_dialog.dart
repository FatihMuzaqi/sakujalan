import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class RejectReasonDialog extends StatefulWidget {
  final String expenseTitle;
  final Function(String reason) onConfirm;

  const RejectReasonDialog({
    super.key,
    required this.expenseTitle,
    required this.onConfirm,
  });

  @override
  State<RejectReasonDialog> createState() => _RejectReasonDialogState();
}

class _RejectReasonDialogState extends State<RejectReasonDialog> {
  final _controller = TextEditingController();
  String? _errorText;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() {
        _errorText = 'Alasan penolakan wajib diisi';
      });
      return;
    }
    widget.onConfirm(text);
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.cancel_outlined, color: AppColors.error),
          SizedBox(width: 8),
          Text('Tolak Pengeluaran'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masukkan alasan penolakan untuk:',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 4),
            Text(
              widget.expenseTitle,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              maxLines: 3,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Contoh: Struk tidak terbaca / tidak sesuai SOP dinas',
                errorText: _errorText,
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) {
                if (_errorText != null) {
                  setState(() => _errorText = null);
                }
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Batal'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
          onPressed: _submit,
          child: const Text('Tolak Pengeluaran'),
        ),
      ],
    );
  }
}
